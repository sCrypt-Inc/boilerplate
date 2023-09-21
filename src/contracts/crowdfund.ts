import {
    assert,
    hash256,
    method,
    prop,
    PubKey,
    pubKey2Addr,
    Sig,
    SmartContract,
    Utils,
} from 'scrypt-ts'

/*
 * Read Medium article about this contract:
 * https://xiaohuiliu.medium.com/crowdfunding-on-bitcoin-169c1f8b6b63
 */
export class Crowdfund extends SmartContract {
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
            pubKey2Addr(this.recipient),
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
        // Check deadline.
        assert(this.timeLock(this.deadline), 'deadline not yet reached')

        assert(
            this.checkSig(sig, this.contributor),
            'contributor signature check failed'
        )
    }
}
