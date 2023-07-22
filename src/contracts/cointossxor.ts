
import { assert, ByteString, PubKey, Sha256, Sig, SmartContract, hash256, len, method, prop, toByteString } from "scrypt-ts";

export class CoinTossXor extends SmartContract{
    @prop()
    alice : PubKey
    @prop()
    bob : PubKey
    @prop()
    aliceHash : Sha256
    @prop()
    bobHash : Sha256

    constructor(alice : PubKey, bob : PubKey, aliceHash : Sha256, bobHash : Sha256){
        super(...arguments)
        this.alice = alice
        this.bob = bob
        this.aliceHash = aliceHash
        this.bobHash = bobHash
    }

    @method()
    public toss(aliceNonce : ByteString, bobNonce : ByteString, sig : Sig){
        // nonce can be of any lenght as long as its resistant to brute-force attack
        // we use 256 bits / 32 bytes as an example here

        assert(BigInt(len(aliceNonce)) == 32n)
        assert(hash256(aliceNonce) == this.aliceHash)
        assert(BigInt(len(bobNonce) == 32n))
        assert(hash256(bobNonce) == this.bobHash)

        // last bit of XOR

        const head : ByteString = xor(BigInt(aliceNonce) , BigInt(bobNonce)) && toByteString('0000000000000000000000000000000000000000000000000000000000000001')

        // head -> Alice; tails bob -> wins

        const winner : PubKey = head ? this.alice : this.bob

        // check winner signature

        assert(this.checkSig(sig, winner))
    }
}
