import {
    assert
} from 'console'
import {
    prop,
    method,
    Sig,
    PubKey,
    ByteString,
    SigHash,
    SmartContract,
     toByteString,
    slice,
    SECP256K1,
      byteString2Int,
hash256,
    reverseByteString
} from 'scrypt-ts'

// a template to implement any new SIGHASH flags
export class UniversalSigHash extends SmartContract {
    @prop()
    pubKey: PubKey

    constructor(pubKey: PubKey) {
        super(...arguments)
        this.pubKey = pubKey
    }

    @method(SigHash.ANYONECANPAY_SINGLE)
    public unlock(sig: Sig) {
        
        let sighash = this.ctx.serialize()
        let sighash1 = slice(sighash, 0n, 4n)
        
        let blankedsighash2to3 = toByteString(
            '00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000'
        )
        let sighash5to10 = slice(sighash, 104n)
        let sighashNew = ((sighash1 as ByteString) +
            blankedsighash2to3 +
            sighash5to10) as ByteString

        
        let hash = byteString2Int(
            reverseByteString(hash256(sighashNew), 32n) + toByteString('00')
        )

        // Veriy signature against the new sighash using the sCrypt SECP256K1 library.
        assert(
            SECP256K1.verifySig(hash, sig, this.pubKey),
            'sig failed'
        )
    }
}
