import { assert } from 'console'
import {
    ByteString,
    FixedArray,
    PubKeyHash,
    SigHash,
    SmartContract,
    Utils,
    hash256,
    method,
    prop,
    toByteString,
    slice,
} from 'scrypt-ts'
import { RabinPubKey, RabinSig, RabinVerifier } from 'scrypt-ts-lib'

const LOCKTIME_BLOCK_HEIGHT_MARKER = 500000000
const UINT_MAX = 0xffffffffn

export type Investment = {
    investor: PubKeyHash
    amount: bigint
}
export class CatBond extends SmartContract {
    static readonly MAX_INVESTORS = 3

    @prop()
    minInvestment: bigint

    @prop()
    premium: bigint // for example 800 means 8.00 %

    @prop()
    startTime: bigint

    @prop()
    matureTime: bigint

    @prop()
    issuer: PubKeyHash

    @prop()
    oracle: RabinPubKey

    @prop()
    minMagnitude: bigint

    @prop(true)
    investments: FixedArray<Investment, typeof CatBond.MAX_INVESTORS>

    @prop(true)
    investmentsEndIdx: bigint

    constructor(
        minInvestment: bigint,
        premium: bigint,
        startTime: bigint,
        matureTime: bigint,
        issuer: PubKeyHash,
        oracle: RabinPubKey,
        minMagnitude: bigint,
        investments: FixedArray<Investment, typeof CatBond.MAX_INVESTORS>
    ) {
        super(...arguments)
        this.minInvestment = minInvestment
        this.premium = premium
        this.startTime = startTime
        this.matureTime = matureTime
        this.issuer = issuer
        this.oracle = oracle
        this.minMagnitude = minMagnitude
        this.investments = investments
        this.investmentsEndIdx = 0n
    }

    @method(SigHash.ANYONECANPAY_SINGLE)
    public invest(investorAddr: PubKeyHash, investAmount: bigint) {
        // Make sure investment is big enough.
        assert(investAmount >= this.minInvestment, 'investment too low')

        // Add new entry to this.investments, update idx.
        for (let i = 0; i < CatBond.MAX_INVESTORS; i++) {
            if (BigInt(i) == this.investmentsEndIdx) {
                this.investments[i] = {
                    investor: investorAddr,
                    amount: investAmount,
                }
            }
        }
        this.investmentsEndIdx++

        // Propagate contract and make sure output amount is utxo.value + invest amount
        const out = this.buildStateOutput(this.ctx.utxo.value + investAmount)
        assert(hash256(out) == this.ctx.hashOutputs, 'hashOutputs mismatch')
    }

    @method(SigHash.ANYONECANPAY_SINGLE)
    public payout(oracleMsg: ByteString, oracleSig: RabinSig) {
        // Check oracle signature.
        assert(
            RabinVerifier.verifySig(oracleMsg, oracleSig, this.oracle),
            'wrong oracle sig'
        )

        // Make sure earthquake was >= this.earthquakeMinMagnitude
        const magnitude = Utils.fromLEUnsigned(slice(oracleMsg, 0n, 1n))
        const timestamp = Utils.fromLEUnsigned(slice(oracleMsg, 1n))
        assert(
            magnitude >= this.minMagnitude,
            'earthquake magnitude threshold not reached'
        )
        assert(timestamp >= this.startTime, 'earthquake timestamp too early')

        // Pay issuer.
        const out = Utils.buildPublicKeyHashOutput(
            this.issuer,
            this.ctx.utxo.value
        )
        assert(hash256(out) == this.ctx.hashOutputs, 'hashOutputs mismatch')
    }

    @method(SigHash.ANYONECANPAY_ALL)
    public mature() {
        // Require nLocktime enabled https://wiki.bitcoinsv.io/index.php/NLocktime_and_nSequence
        assert(this.ctx.sequence < UINT_MAX, 'require nLocktime enabled')

        // Check if using block height.
        if (this.matureTime < LOCKTIME_BLOCK_HEIGHT_MARKER) {
            // Enforce nLocktime field to also use block height.
            assert(this.ctx.locktime < LOCKTIME_BLOCK_HEIGHT_MARKER)
        }
        assert(
            this.ctx.locktime >= this.matureTime,
            'mature time not yet reached'
        )

        // Pay each investor amount + preimium
        let outputs = toByteString('')
        for (let i = 0; i < CatBond.MAX_INVESTORS; i++) {
            if (BigInt(i) < this.investmentsEndIdx) {
                const investment: Investment = this.investments[i]
                const interest = (investment.amount * this.premium) / 10000n
                outputs += Utils.buildPublicKeyHashOutput(
                    investment.investor,
                    investment.amount + interest
                )
            }
        }
        // Add change output.
        outputs += this.buildChangeOutput()

        assert(hash256(outputs) == this.ctx.hashOutputs, 'hashOutputs mismatch')
    }
}
