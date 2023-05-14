import { assert } from "console";
import { ByteString, PubKey, Sha256, Sig, SmartContract, method, prop, sha256 } from "scrypt-ts";

export class Netflix extends SmartContract{
    @prop()
    alice : PubKey
    @prop()
    bob : PubKey
    @prop()
    hash : Sha256

    constructor(alice : PubKey, bob : PubKey, hash : Sha256){
        super(...arguments)
        this.alice  = alice
        this.bob = bob
        this.hash = hash
    }

    @method()
    public unlock(dataOrSig : ByteString, sig : Sig){
        if (sha256(dataOrSig) != this.hash){
            let aliceSig : Sig = Sig(dataOrSig)

            
        }
        assert(this.checkSig(sig, this.alice))
    }
}