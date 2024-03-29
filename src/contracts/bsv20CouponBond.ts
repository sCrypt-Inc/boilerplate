import { BSV20V2 } from 'scrypt-ord'
import {
    assert,
    ByteString,
    byteString2Int,
    Constants,
    fill,
    FixedArray,
    hash256,
    method,
    prop,
    PubKey,
    pubKey2Addr,
    Sig,
    slice,
    toByteString,
    Utils,
} from 'scrypt-ts'
import { RabinPubKey, RabinSig, RabinVerifier } from 'scrypt-ts-lib'

export type BondInvestor = {
    emptySlot: boolean
    pubKey: PubKey
    forSale: boolean
    price: bigint
}

export class Bsv20CouponBond extends BSV20V2 {
    static readonly N_INVESTORS = 10

    @prop()
    issuer: PubKey

    @prop(true)
    investors: FixedArray<BondInvestor, typeof Bsv20CouponBond.N_INVESTORS>

    @prop()
    faceValue: bigint

    @prop()
    interestRate: bigint // 1n == 1%

    @prop()
    matureTime: bigint

    @prop()
    oraclePubKey: RabinPubKey

    constructor(
        id: ByteString,
        sym: ByteString,
        max: bigint,
        dec: bigint,
        issuer: PubKey,
        faceValue: bigint,
        interestRate: bigint,
        matureTime: bigint,
        oraclePubKey: RabinPubKey
    ) {
        super(id, sym, max, dec)
        this.init(...arguments)

        this.issuer = issuer
        this.investors = fill(
            {
                emptySlot: true,
                pubKey: PubKey(
                    toByteString(
                        '000000000000000000000000000000000000000000000000'
                    )
                ),
                forSale: false,
                price: 0n,
            } as BondInvestor,
            10
        )
        this.faceValue = faceValue
        this.interestRate = interestRate
        this.matureTime = matureTime
        this.oraclePubKey = oraclePubKey
    }

    @method()
    public invest(
        slotIdx: bigint,
        investorPubKey: PubKey,
        investorSig: Sig,
        oracleMsg: ByteString,
        oracleSig: RabinSig
    ) {
        // Check investor sig.
        assert(
            this.checkSig(investorSig, investorPubKey),
            'invalid sig investor'
        )

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

        // Ensure token amount is equal to the face value.
        assert(utxoTokenAmt == this.faceValue, 'utxo token amount insufficient')

        // Check slot index is empty.
        const investor = this.investors[Number(slotIdx)]
        assert(investor.emptySlot, 'slot is not empty')

        // Add to investors array.
        this.investors[Number(slotIdx)] = {
            emptySlot: false,
            pubKey: investorPubKey,
            forSale: false,
            price: 0n,
        }

        // Ensure that investor pays issuer face value
        // and propagate contract.
        let outputs = this.buildStateOutput(this.ctx.utxo.value)
        outputs += BSV20V2.buildTransferOutput(
            pubKey2Addr(this.issuer),
            this.id,
            this.faceValue
        )
        outputs += this.buildChangeOutput()
        assert(hash256(outputs) == this.ctx.hashOutputs, 'hashOutputs mismatch')
    }

    @method()
    public makePayment(
        issuerSig: Sig,
        oracleMsg: ByteString,
        oracleSig: RabinSig
    ) {
        // Check issuer sig.
        assert(this.checkSig(issuerSig, this.issuer), 'invalid sig issuer')

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

        // For each investor add an output that pays them interest.
        const interest = (this.faceValue * this.interestRate) / 100n
        let outputs = toByteString('')
        let totalAmt = 0n
        for (let i = 0; i < Bsv20CouponBond.N_INVESTORS; i++) {
            const investor = this.investors[i]
            if (!investor.emptySlot) {
                outputs += BSV20V2.buildTransferOutput(
                    pubKey2Addr(investor.pubKey),
                    this.id,
                    interest
                )
                totalAmt += interest
            }
        }

        // Get token amount held by the UTXO from oracle message.
        const utxoTokenAmt = byteString2Int(
            slice(oracleMsg, Constants.OutpointLen, 44n)
        )

        // Ensure utxo token amount covers output token amount.
        assert(utxoTokenAmt >= totalAmt, 'utxo token amount insufficient')

        // Enforce outputs.
        outputs += this.buildChangeOutput()
        assert(hash256(outputs) == this.ctx.hashOutputs, 'hashOutputs mismatch')
    }

    @method()
    public mature(issuerSig: Sig, oracleMsg: ByteString, oracleSig: RabinSig) {
        // Check issuer sig.
        assert(this.checkSig(issuerSig, this.issuer), 'invalid sig issuer')

        // Check mature time.
        assert(this.timeLock(this.matureTime), 'not matured yet')

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

        // For each investor add an output that pays them the face value token amount.
        let outputs = toByteString('')
        let totalAmt = 0n
        for (let i = 0; i < Bsv20CouponBond.N_INVESTORS; i++) {
            const investor = this.investors[i]
            if (!investor.emptySlot) {
                outputs += BSV20V2.buildTransferOutput(
                    pubKey2Addr(investor.pubKey),
                    this.id,
                    this.faceValue
                )
                totalAmt += this.faceValue
            }
        }

        // Get token amount held by the UTXO from oracle message.
        const utxoTokenAmt = byteString2Int(
            slice(oracleMsg, Constants.OutpointLen, 44n)
        )

        // Ensure utxo token amount covers output token amount.
        assert(utxoTokenAmt >= totalAmt, 'utxo token amount insufficient')

        // Enforce outputs.
        outputs += this.buildChangeOutput()
        assert(hash256(outputs) == this.ctx.hashOutputs, 'hashOutputs mismatch')
    }

    @method()
    public listForSale(slotIdx: bigint, price: bigint, investorSig: Sig) {
        const investor = this.investors[Number(slotIdx)]

        // Check investor sig.
        assert(
            this.checkSig(investorSig, investor.pubKey),
            'invalid sig investor'
        )

        // Check price value.
        assert(price > 0n, 'invalid price value')

        // Toggle forSale flag and set price.
        this.investors[Number(slotIdx)].forSale = true
        this.investors[Number(slotIdx)].price = price

        // Propagate contract.
        let outputs = this.buildStateOutput(this.ctx.utxo.value)
        outputs += this.buildChangeOutput()
        assert(hash256(outputs) == this.ctx.hashOutputs, 'hashOutputs mismatch')
    }

    @method()
    public buy(slotIdx: bigint, newOwner: PubKey, newOwnerSig: Sig) {
        const investor = this.investors[Number(slotIdx)]

        // Check new owner sig.
        assert(this.checkSig(newOwnerSig, newOwner), 'invalid sig investor')

        // Check bond is for sale.
        assert(investor.forSale, 'bond not for sale')

        // Toggle forSale flag.
        this.investors[Number(slotIdx)].forSale = false

        // Propagate contract and ensure new owner pays seller of the bond.
        let outputs = this.buildStateOutput(this.ctx.utxo.value)
        outputs += Utils.buildAddressOutput(
            pubKey2Addr(investor.pubKey),
            investor.price
        )
        outputs += this.buildChangeOutput()
        assert(hash256(outputs) == this.ctx.hashOutputs, 'hashOutputs mismatch')
    }
}
