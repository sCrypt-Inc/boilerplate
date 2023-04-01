import {
    assert,
    ByteString,
    hash160,
    hash256,
    method,
    prop,
    PubKey,
    PubKeyHash,
    SmartContract,
    Sig,
    SigHash,
} from 'scrypt-ts'

export class OrdinalLock extends SmartContract {
    @prop()
    seller: PubKeyHash

    @prop()
    payOutput: ByteString

    constructor(seller: PubKeyHash, payOutput: ByteString) {
        super(...arguments)

        this.seller = seller
        this.payOutput = payOutput
    }

    @method(SigHash.ANYONECANPAY_ALL)
    public purchase(selfOutput: ByteString, trailingOutputs: ByteString) {
        assert(
            hash256(selfOutput + this.payOutput + trailingOutputs) ==
                this.ctx.hashOutputs
        )
    }

    @method()
    public cancel(sig: Sig, pubkey: PubKey) {
        assert(this.seller == hash160(pubkey), 'bad seller')
        assert(this.checkSig(sig, pubkey), 'signature check failed')
    }
}
