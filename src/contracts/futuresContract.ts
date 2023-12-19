import {
    ByteString,
    byteString2Int,
    hash256,
    method,
    prop,
    PubKey,
    pubKey2Addr,
    slice,
    SmartContract,
    Utils,
    assert,
} from 'scrypt-ts'
import { RabinPubKey, RabinSig, RabinVerifier } from 'scrypt-ts-lib'

export class FuturesContract extends SmartContract {
    @prop()
    buyer: PubKey

    @prop()
    seller: PubKey

    // Unit price of the asset.
    @prop(true)
    price: bigint

    // Asset amount.
    @prop()
    amt: bigint

    // Initial margin absolute amount (satoshis).
    @prop()
    initialMargin: bigint

    // Maintenance margin amount. If margin account of either
    // party falls below this amount, a margin call can be triggered.
    @prop()
    maintenanceMargin: bigint

    @prop(true)
    marginAccountBuyer: bigint

    @prop(true)
    marginAccountSeller: bigint

    @prop(true)
    hasMarginCallSeller: boolean

    @prop(true)
    hasMarginCallBuyer: boolean

    @prop(true)
    marginCallDeadlineBuyer: bigint

    @prop(true)
    marginCallDeadlineSeller: bigint

    // Date at which the settlement can be carried out.
    @prop()
    settlementDate: bigint

    @prop(true)
    settlementInitiated: boolean

    // Oracle used to verify tokens origin.
    @prop()
    ordOraclePubKey: RabinPubKey

    // Oracle used to get current token price.
    @prop()
    priceOraclePubKey: RabinPubKey

    constructor(
        buyer: PubKey,
        seller: PubKey,
        price: bigint,
        amt: bigint,
        initialMargin: bigint,
        maintenanceMargin: bigint,
        settlementDate: bigint,
        ordOraclePubKey: RabinPubKey,
        priceOraclePubKey: RabinPubKey
    ) {
        super(...arguments)

        this.buyer = buyer
        this.seller = seller
        this.price = price
        this.amt = amt
        this.initialMargin = initialMargin
        this.maintenanceMargin = maintenanceMargin
        this.marginAccountBuyer = initialMargin
        this.marginAccountSeller = initialMargin
        this.hasMarginCallBuyer = false
        this.hasMarginCallSeller = false
        this.marginCallDeadlineBuyer = 0n
        this.marginCallDeadlineSeller = 0n
        this.settlementDate = settlementDate
        this.settlementInitiated = false
        this.ordOraclePubKey = ordOraclePubKey
        this.priceOraclePubKey = priceOraclePubKey
    }

    @method()
    public adjust(oracleMsg: ByteString, oracleSig: RabinSig) {
        // Check oracle signature.
        assert(
            RabinVerifier.verifySig(oracleMsg, oracleSig, this.ordOraclePubKey),
            'oracle sig verify failed'
        )

        // Check that we're unlocking the UTXO specified in the oracles message.
        assert(
            slice(this.prevouts, 36n, 72n) == slice(oracleMsg, 0n, 36n),
            'second input is not spending specified UTXO'
        )

        // Get token price from oracle message.
        const newPrice = byteString2Int(slice(oracleMsg, 36n, 44n))

        // Get timestamp from oracle message.
        const timestamp = byteString2Int(slice(oracleMsg, 44n, 48n))

        // Update margin accounts.
        const totalValueOld = this.price * this.amt
        const totalValueNew = newPrice * this.amt
        const diff = totalValueNew - totalValueOld

        if (diff > 0n) {
            this.marginAccountSeller -= diff
            this.marginAccountBuyer += diff

            // Check if seller has margin call.
            if (this.marginAccountSeller < this.maintenanceMargin) {
                this.hasMarginCallSeller = true
                this.marginCallDeadlineSeller = timestamp + 86400n // + 24 hrs
            }
        } else {
            this.marginAccountSeller += diff
            this.marginAccountBuyer -= diff

            // Check if buyer has margin call.
            if (this.marginAccountBuyer < this.maintenanceMargin) {
                this.hasMarginCallBuyer = true
                this.marginCallDeadlineBuyer = timestamp + 86400n // + 24 hrs
            }
        }

        // Propagate contract
        let outputs = this.buildStateOutput(this.ctx.utxo.value)
        outputs += this.buildChangeOutput()
        assert(hash256(outputs) == this.ctx.hashOutputs, 'hashOutputs mismatch')
    }

    @method()
    public marginCall(buyer: boolean) {
        // Check if party has pending margin call.
        assert(
            buyer ? this.hasMarginCallBuyer : this.hasMarginCallSeller,
            'party does not have pending maring call'
        )

        // Get needed deposit amount.
        const margin = buyer
            ? this.marginAccountBuyer
            : this.marginAccountSeller
        const neededDeposit = this.initialMargin - margin

        // Update margin account and reset margin call flag.
        if (buyer) {
            this.marginAccountBuyer = this.initialMargin
            this.hasMarginCallBuyer = false
        } else {
            this.marginAccountSeller = this.initialMargin
            this.hasMarginCallSeller = false
        }

        // Make sure difference was actually deposited and propagate contract.
        let outputs = this.buildStateOutput(this.ctx.utxo.value + neededDeposit)
        outputs += this.buildChangeOutput()
        assert(hash256(outputs) == this.ctx.hashOutputs, 'hashOutputs mismatch')
    }

    @method()
    public close() {
        if (this.hasMarginCallBuyer || this.hasMarginCallSeller) {
            // Check deadline passed.
            assert(
                this.timeLock(this.marginCallDeadlineBuyer),
                'margin call deadline not passed'
            )
        } else {
            // Check settlement date is reached.
            assert(
                this.timeLock(this.settlementDate),
                'settlement date not yet reached'
            )
        }

        // Ensure each party gets their margin.
        let outputs = Utils.buildAddressOutput(
            pubKey2Addr(this.seller),
            this.marginAccountSeller
        )
        outputs += Utils.buildAddressOutput(
            pubKey2Addr(this.buyer),
            this.marginAccountBuyer
        )
        outputs += this.buildChangeOutput()
        assert(hash256(outputs) == this.ctx.hashOutputs, 'hashOutputs mismatch')
    }
}
