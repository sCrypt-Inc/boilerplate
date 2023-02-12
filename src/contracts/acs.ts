import {
    assert,
    ByteString,
    hash256,
    method,
    prop,
    PubKeyHash,
    SigHash,
    SmartContract,
    Utils,
} from 'scrypt-ts'

export class AnyoneCanSpend extends SmartContract {
    // Address of the recipient.
    @prop()
    readonly pubKeyHash: PubKeyHash

    constructor(pubKeyHash: PubKeyHash) {
        super(...arguments)
        this.pubKeyHash = pubKeyHash
    }

    @method(SigHash.ANYONECANPAY_SINGLE)
    public unlock() {
        const output: ByteString = Utils.buildPublicKeyHashOutput(
            this.pubKeyHash,
            this.changeAmount
        )
        assert(
            hash256(output) == this.ctx.hashOutputs,
            'hashOutputs check failed'
        )
    }
}
