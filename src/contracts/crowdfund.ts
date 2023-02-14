import {
    assert,
    hash160,
    hash256,
    method,
    prop,
    PubKey,
    Sig,
    SmartContract,
    Utils,
} from 'scrypt-ts'

export class Crowdfund extends SmartContract {
    static readonly LOCKTIME_BLOCK_HEIGHT_MARKER = 500000000
    static readonly UINT_MAX = 0xffffffffn

    @prop()
    readonly recipient: PubKey

    @prop()
    readonly contributor: PubKey

    @prop()
    readonly deadline: bigint

    @prop()
    readonly target: bigint

    constructor(
        recipient: PubKey,
        contributor: PubKey,
        deadline: bigint,
        target: bigint
    ) {
        super(...arguments)
        this.recipient = recipient
        this.contributor = contributor
        this.deadline = deadline
        this.target = target
    }

    // Method to collect pledged fund.
    @method()
    public collect(sig: Sig) {
        // Ensure the collected amount actually reaches the target.
        assert(this.ctx.utxo.value >= this.target)
        // Funds go to the recipient.
        const output = Utils.buildPublicKeyHashOutput(
            hash160(this.recipient),
            this.changeAmount
        )
        // Ensure the payment output to the recipient is actually in the unlocking TX.
        assert(
            hash256(output) == this.ctx.hashOutputs,
            'hashOutputs check failed'
        )
        // Validate signature of recipient
        assert(
            this.checkSig(sig, this.recipient),
            'recipient signature check failed'
        )
    }

    // Contributors can be refunded after the deadline.
    @method()
    public refund(sig: Sig) {
        // Require nLocktime enabled https://wiki.bitcoinsv.io/index.php/NLocktime_and_nSequence
        assert(
            this.ctx.sequence < Crowdfund.UINT_MAX,
            'require nLocktime enabled'
        )

        // Check if using block height.
        if (this.deadline < Crowdfund.LOCKTIME_BLOCK_HEIGHT_MARKER) {
            // Enforce nLocktime field to also use block height.
            assert(this.ctx.locktime < Crowdfund.LOCKTIME_BLOCK_HEIGHT_MARKER)
        }
        assert(this.ctx.locktime >= this.deadline, 'fundraising expired')
        assert(
            this.checkSig(sig, this.contributor),
            'contributor signature check failed'
        )
    }
}
