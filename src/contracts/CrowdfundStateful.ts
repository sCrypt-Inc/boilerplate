import {
    assert,
    ByteString,
    hash160,
    hash256,
    HashedMap,
    method,
    prop,
    PubKey,
    Sig,
    SmartContract,
    Utils,
} from 'scrypt-ts'

/*
 * Read Medium article about this contract:
 * https://xiaohuiliu.medium.com/crowdfunding-on-bitcoin-169c1f8b6b63
 */

export type DonorMap = HashedMap<PubKey, bigint>
export type RefundMap = HashedMap<PubKey, boolean>


export class CrowdfundStateful extends SmartContract {
    @prop()
    static readonly LOCKTIME_BLOCK_HEIGHT_MARKER: bigint = 500000000n
    @prop()
    static readonly UINT_MAX: bigint = 0xffffffffn

    @prop()
    readonly beneficiary: PubKey

    @prop(true)
    donor: DonorMap

    @prop(true)
    donation: bigint

    @prop(true)
    donationCount: bigint

    @prop(true)
    is_Donated: boolean

    @prop(true)
    donorRefunded: RefundMap
    

    @prop()
    readonly deadline: bigint

    @prop()
    readonly target: bigint

    constructor(
        beneficiary: PubKey,
        donor: DonorMap,
        donorRefunded : RefundMap,
        donation: bigint,
        donationCount: bigint,
        deadline: bigint,
        target: bigint
    ) {
        super(...arguments)
        this.beneficiary = beneficiary
        this.donor = donor
        this.donation = 0n
        this.donationCount = 0n
        this.is_Donated = false
        this.donorRefunded = donorRefunded
        this.deadline = deadline
        this.target = target
    }

    // method to donate
    @method()
    public donate(contributor: PubKey, amount: bigint) {
        // donation not equal to zero
        assert(amount > 0n, 'Donation should be greater than 0')
        this.donor.set(contributor, amount)

        //setting refunded to false
        this.donorRefunded.set(contributor, false)

        // updating the donation amount
        this.donation += amount

        // updating the total number of donation
        this.donationCount += 1n

        // confirmed as denoted
        this.is_Donated = true
        assert(
            this.ctx.sequence < CrowdfundStateful.UINT_MAX,
            'require nLocktime enabled'
        )

        // Check if using block height.
        if (this.deadline < CrowdfundStateful.LOCKTIME_BLOCK_HEIGHT_MARKER) {
            // Enforce nLocktime field to also use block height.
            assert(
                this.ctx.locktime <
                    CrowdfundStateful.LOCKTIME_BLOCK_HEIGHT_MARKER
            )
        }
        assert(
            this.ctx.locktime >= this.deadline,
            ' You cannot donate afterfundraising expired'
        )

        //updating the contract state
        let output: ByteString = this.buildStateOutput(this.ctx.utxo.value)

        // handling change output
        if (this.changeAmount > 0n) {
            output += this.buildChangeOutput()
        }

        assert(hash256(output) == this.ctx.hashOutputs, 'hashOutputs mismatch')
    }

    // Method to collect pledged fund.
    @method()
    public collect(sig: Sig) {
        // Ensure the collected amount actually reaches the target.
        assert(this.donation >= this.target)
        // Funds go to the beneficiary.
        const output0 = Utils.buildPublicKeyHashOutput(
            hash160(this.beneficiary),
            this.changeAmount
        )
        let output1: ByteString = this.buildStateOutput(this.donation)

        let outputs = output0 + output1

        // handling change output
        if (this.changeAmount > 0n) {
            outputs += this.buildChangeOutput()
        }

        assert(hash256(outputs) == this.ctx.hashOutputs, 'hashOutputs mismatch')
        // Validate signature of beneficiary
        assert(
            this.checkSig(sig, this.beneficiary),
            'beneficiary signature check failed'
        )
    }

    // donors can be refunded after the deadline.
    @method()
    public refund(contributor: PubKey, amount: bigint, sig: Sig) {
        assert(this.donor.canGet(contributor, amount))

         // make sure it has not refunded before
        assert(this.donorRefunded.canGet(contributor, false), 'already refunded')

        //make sure that address requesting for refund has already denoted
        assert(this.is_Donated == true, 'only denotors can request refund')


        // update state
        let output: ByteString = this.buildStateOutput(this.ctx.utxo.value)

        // setting it as refunded
        this.donorRefunded.set(contributor, true)

        // checking the validity of the signature
        assert(this.checkSig(sig, contributor), 'donor signature check failed')

        // refund output
        const refund = Utils.buildPublicKeyHashOutput(
            hash160(contributor),
            amount
        )

        let outputs = refund + output

        if (this.changeAmount > 0n) {
            outputs += this.buildChangeOutput()
        }

        assert(
            hash256(outputs) == this.ctx.hashOutputs,
            'hashOutput Misssmatch'
        )
    }
}
