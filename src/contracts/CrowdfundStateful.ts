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

export class Crowdfund2 extends SmartContract {
    @prop()
    static readonly LOCKTIME_BLOCK_HEIGHT_MARKER : bigint = 500000000n
    @prop()
    static readonly UINT_MAX : bigint = 0xffffffffn

    @prop()
    readonly beneficiary: PubKey

    @prop(true)
    donor: DonorMap

    @prop(true)
    donation: bigint

    @prop(true)
    donationCount: bigint

    @prop(true)
    is_donated: boolean

    @prop(true)
    is_refunded: boolean

    @prop()
    readonly deadline: bigint

    @prop()
    readonly target: bigint

    constructor(
        beneficiary: PubKey,
        donor: DonorMap,
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
        this.is_donated = false
        this.is_refunded = false
        this.deadline = deadline
        this.target = target
    }

    // method to donate
    @method()
    public donate(contributor: PubKey, amount: bigint) {
        // donation not equal to zero
        assert(amount > 0n, 'Donation should be greater than 0')
        this.donor.set(contributor, amount)

        // updating the donation amount
        this.donation += amount

        // updating the total number of donation
        this.donationCount += 1n

        // confirmed as denoted
        this.is_donated = true
        assert(
            this.ctx.sequence < Crowdfund2.UINT_MAX,
            'require nLocktime enabled'
        )

        // Check if using block height.
        if (this.deadline < Crowdfund2.LOCKTIME_BLOCK_HEIGHT_MARKER) {
            // Enforce nLocktime field to also use block height.
            assert(this.ctx.locktime < Crowdfund2.LOCKTIME_BLOCK_HEIGHT_MARKER)
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
        assert(this.ctx.utxo.value >= this.target)
        // Funds go to the beneficiary.
        const output = Utils.buildPublicKeyHashOutput(
            hash160(this.beneficiary),
            this.changeAmount
        )
        // Ensure the payment output to the beneficiary is actually in the unlocking TX.
        assert(
            hash256(output) == this.ctx.hashOutputs,
            'hashOutputs check failed'
        )
        // Validate signature of beneficiary
        assert(
            this.checkSig(sig, this.beneficiary),
            'beneficiary signature check failed'
        )
    }

    // donors can be refunded after the deadline.
    @method()
    public refund(contributor: PubKey, amount : bigint, sig: Sig) {
        
        assert(this.donor.canGet(contributor, amount))

        //make sure that address requesting for refund has already denoted
        assert(this.is_donated == true, 'only denotors can request refund')

        // make sure it has not refunded before
        assert((!this.is_refunded), 'already refunded')

        // refund output
        const refund = Utils.buildPublicKeyHashOutput(
            hash160(contributor),
            amount
        )

        // setting it as refunded
        this.is_refunded = true
        assert(this.checkSig(sig, contributor), 'donor signature check failed')

        // update state
        let output : ByteString = this.buildStateOutput(this.ctx.utxo.value)

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
