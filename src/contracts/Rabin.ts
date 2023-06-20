import{
SmartContractLib,
method,
ByteString,
sha256,
boolean
} from 'scrypt-ts'

export type RabinPubkey = bigint

export type RabinSig = {
 s : bigint
 padding : ByteString
}

export class RabinSignature extends SmartContractLib{

@method()
static checkSig(msg : ByteString, sig : RabinSig, pubkey : RabinPubkey) : boolean {
let h : bigint = Utils.fromLEUnsigned(hash(msg + sig.padding))
  return (sig.s * sig.s) % pubkey == h % pubkey
}

@method()
static hash(x : ByteString) : ByteString{
// expand in to 512 bit hash
let hx : ByteString = sha256(x)
let idx : bigint = len(hx) / 2

return sha256(hx[: idx]) + sha256(hx[idx :])

}

}