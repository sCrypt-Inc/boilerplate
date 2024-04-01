import { BSV20V2 } from 'scrypt-ord'
import {
    ByteString,
    byteString2Int,
    hash256,
    method,
    prop,
    PubKey,
    pubKey2Addr,
    Sig,
    slice,
    Utils,
    assert,
    Constants,
} from 'scrypt-ts'
import { RabinPubKey, RabinSig, RabinVerifier } from 'scrypt-ts-lib'

/**
 * This is a simplistic implementation of a forward contract where two parties agree
 * to trade a predetermined quantity of an asset (BSV-20 tokens) at a specified price at a future date.
 * The contract requires the full amount to be exchanged. To mitigate risk, both parties are required
 * to deposit collateral upon the contract's deployment.
 */
export class Bsv20ForwardContract extends BSV20V2 {
    @prop()
    buyer: PubKey

    @prop()
    seller: PubKey

    // Unit price of the asset.
    @prop()
    price: bigint

    // Asset amount.
    @prop()
    amt: bigint

    // Collateral amount.
    @prop()
    collateral: bigint

    // Date at which the settlement can be carried out.
    @prop()
    settlementDate: bigint

    // Deadline for settlement.
    @prop()
    deadline: bigint

    @prop(true)
    settlementInitiated: boolean

    // Oracle is used to verify tokens origin.
    @prop()
    oraclePubKey: RabinPubKey

    constructor(
        id: ByteString,
        sym: ByteString,
        max: bigint,
        dec: bigint,
        buyer: PubKey,
        seller: PubKey,
        price: bigint,
        amt: bigint,
        collateral: bigint,
        settlementDate: bigint,
        deadline: bigint,
        oraclePubKey: RabinPubKey
    ) {
        super(id, sym, max, dec)
        this.init(...arguments)

        this.buyer = buyer
        this.seller = seller
        this.price = price
        this.amt = amt
        this.collateral = collateral
        this.settlementDate = settlementDate
        this.deadline = deadline
        this.settlementInitiated = false
        this.oraclePubKey = oraclePubKey
    }

    @method()
    public initiateSettlement(sigBuyer: Sig) {
        // Check settlement date is reached.
        assert(
            this.timeLock(this.settlementDate),
            'settlement date not yet reached'
        )

        // Check buyer signature.
        assert(this.checkSig(sigBuyer, this.buyer), 'buyer sig invalid')

        // Toggle settlementInitiated flag.
        this.settlementInitiated = true

        // Ensure buyer deposits full amount and propagate contract.
        let outputs = this.buildStateOutput(
            this.ctx.utxo.value + this.amt * this.price
        )
        outputs += this.buildChangeOutput()
        assert(hash256(outputs) == this.ctx.hashOutputs, 'hashOutputs mismatch')
    }

    @method()
    public settle(sigSeller: Sig, oracleMsg: ByteString, oracleSig: RabinSig) {
        // Check if settlement is initiated.
        assert(this.settlementInitiated, 'settlement not initiated')

        // Check seller signature
        assert(this.checkSig(sigSeller, this.seller), 'seller sig invalid')

        // Check oracle signature.
        assert(
            RabinVerifier.verifySig(oracleMsg, oracleSig, this.oraclePubKey),
            'oracle sig verify failed'
        )

        // Check that we're unlocking the UTXO specified in the oracles message.
        assert(
            slice(
                this.prevouts,
                Constants.OutpointLen,
                Constants.OutpointLen * 2n
            ) == slice(oracleMsg, 0n, Constants.OutpointLen),
            'second input is not spending specified ordinal UTXO'
        )

        // Get token amount held by the UTXO from oracle message.
        const utxoTokenAmt = byteString2Int(
            slice(oracleMsg, Constants.OutpointLen, 44n)
        )

        // Check token amount is correct.
        assert(utxoTokenAmt == this.amt, 'invalid token amount')

        // Ensure contract pays total amount to seller. Also include their collateral.
        let outputs = Utils.buildAddressOutput(
            pubKey2Addr(this.seller),
            this.amt * this.price + this.collateral
        )

        // Ensure seller sends assets to buyer.
        outputs += BSV20V2.buildTransferOutput(
            pubKey2Addr(this.buyer),
            this.id,
            this.amt
        )

        // Also return buyers collateral.
        outputs += Utils.buildAddressOutput(
            pubKey2Addr(this.buyer),
            this.collateral
        )

        assert(hash256(outputs) == this.ctx.hashOutputs, 'hashOutputs mismatch')
    }

    @method()
    public withdraw(sig: Sig) {
        // Check deadline is reached.
        assert(this.timeLock(this.deadline), 'deadline not yet reached')

        // If settlement is initiated, pay out total amount to buyer.
        // If not, pay out to seller.
        const dest = this.settlementInitiated ? this.buyer : this.seller
        let outputs = Utils.buildAddressOutput(
            pubKey2Addr(dest),
            this.ctx.utxo.value
        )
        outputs += this.buildChangeOutput()
        assert(hash256(outputs) == this.ctx.hashOutputs, 'hashOutputs mismatch')
    }
}
