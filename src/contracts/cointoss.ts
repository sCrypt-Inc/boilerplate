import { assert } from "console";
import { utils } from "mocha";
import { ByteString, PubKey, Sha256, Sig, SmartContract, Utils, hash160, hash256, method, prop, toByteString } from "scrypt-ts";

export class CoinToss extends SmartContract{
    @prop()
    alice : PubKey
    @prop()
    bob : PubKey
    @prop()
    aliceHash : Sha256
     @prop()
    bobHash : Sha256
     @prop()
    N : bigint
   

    constructor(alice : PubKey, bob : PubKey, aliceHash : Sha256, bobHash : Sha256, N : bigint){
        super(...arguments)
        this.alice = alice
        this.bob = bob
        this.aliceHash = aliceHash
        this.bobHash = bobHash
        this.N = N
       
    }

    @method()
    public toss(aliceNonce : bigint, bobNonce : bigint, sig : Sig){
     
     assert(hash256(aliceNonce) == this.aliceHash, 'hash mismatch')
      assert(hash256(bobNonce) == this.bobHash, 'hash mismatch')

      let head : bigint = aliceNonce == bobNonce || aliceNonce == this.N - bobNonce

      const winner : PubKey = head ? this.bob : this.alice

      assert(this.checkSig(sig, winner))

    }

}