
import { ByteString, SmartContractLib, Utils, hash256, len, method, sha256 } from "scrypt-ts"

//Rabin Public Key
type RabinPubKey = bigint

//Rabin signature is combination of (S, U).

type RabinSig = {
    s : bigint  // S
    padding : ByteString //U
}
    export class RabinSignature extends SmartContractLib{

        @method()
        static checkSig(msg : ByteString, sig : RabinSig, pubkey : RabinPubKey) : boolean{
            const h : bigint = Utils.fromLEUnsigned(hash256(msg + sig + sig.padding))
            return (sig.s * sig.s) % pubkey == h % pubkey
        }
        
        @method()
        static hash(x : ByteString) : ByteString{
            // expand in to 512 bit hash

            const hx : ByteString = sha256(x)

            const idx = len(hx) / 2

            return sha256(hx[idx]) + sha256(hx[idx ])

        }

    }