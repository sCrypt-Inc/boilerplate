import { assert } from 'console'
import {
    ByteString,
    method,
    prop,
    SmartContract,
    sha256,
    PubKey,
    Sig,
} from 'scrypt-ts'

export class TimedCommit extends SmartContract {
    @prop()
    aliceHash: ByteString

    @prop()
    alice: PubKey

    @prop()
    bob: PubKey

    constructor(aliceHash: ByteString, alice: PubKey, bob: PubKey) {
        super(...arguments)
        this.aliceHash = aliceHash
        this.alice = alice
        this.bob = bob
    }

    @method()
    public open(aliceNonce: ByteString, aliceSig: Sig) {
        assert(sha256(aliceNonce) == this.aliceHash, 'Alice hash mismatch')
        assert(this.checkSig(aliceSig, this.alice), 'Alice invalid sig')
    }

    @method()
    public forfeit(aliceSig: Sig, bobSig: Sig) {
        assert(this.checkSig(aliceSig, this.alice), 'Alice invalid sig')
        assert(this.checkSig(bobSig, this.bob), 'Bob invalid sig')
    }
}
