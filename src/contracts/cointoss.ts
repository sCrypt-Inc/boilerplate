import {
    prop,
    SmartContract,
    PubKey,
    Sha256,
    method,
    Sig,
    hash256,
    ByteString,
    assert,
} from 'scrypt-ts'

export class CoinToss extends SmartContract {
    @prop()
    alice: PubKey
    @prop()
    bob: PubKey
    @prop()
    aliceHash: Sha256
    @prop()
    bobHash: Sha256
    @prop()
    N: ByteString

    constructor(
        alice: PubKey,
        bob: PubKey,
        aliceHash: Sha256,
        bobHash: Sha256,
        N: ByteString
    ) {
        super(...arguments)

        this.alice = alice
        this.bob = bob
        this.aliceHash = aliceHash
        this.bobHash = bobHash
        this.N = N
    }

    @method()
    public toss(aliceNonce: ByteString, bobNonce: ByteString, sig: Sig) {
        assert(hash256(aliceNonce) == this.aliceHash, 'hash mismatch')

        assert(hash256(bobNonce) == this.bobHash, 'hash mismatch')

        // if head bob wins else alice wins
        if (aliceNonce == bobNonce || aliceNonce == this.N) {
            const winner: PubKey = this.bob
            // if winner take all the money
            assert(this.checkSig(sig, winner))
        } else {
            const winner: PubKey = this.alice
            // winner take all the money
            assert(this.checkSig(sig, winner))
        }
    }
}
