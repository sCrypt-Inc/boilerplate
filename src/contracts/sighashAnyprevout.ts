import {
    assert,
    ByteString,
    byteString2Int,
    hash256,
    method,
    prop,
    reverseByteString,
    SigHash,
    slice,
    SmartContract,
    toByteString,
} from 'scrypt-ts'
import { Point, SECP256K1, Signature } from 'scrypt-ts-lib'

/*
 * A contract that emulates SIGHASH_ANYPREVOUT (previously named SIGHASH_NOINPUT).
 *
 * Read our Medium article for more information:
 * https://medium.com/coinmonks/emulate-any-sighash-flag-without-a-fork-568fa624039f
 */
export class SigHashAnyprevout extends SmartContract {
    @prop()
    pubKey: Point

    constructor(pubKey: Point) {
        super(...arguments)
        this.pubKey = pubKey
    }

    @method(SigHash.ANYONECANPAY_SINGLE)
    public unlock(sig: Signature) {
        // Reconstruct the sighash preimage, that was signed signed (sig).
        const preimage = this.ctx.serialize()
        const preimage1 = slice(preimage, 0n, 4n)
        // Mask hashPrevouts, hashSequence, outpoint.
        const blankedPreimage2to3 = toByteString(
            '00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000'
        )
        const preimage5to10 = slice(preimage, 104n)
        const preimageNew = ((preimage1 as ByteString) +
            blankedPreimage2to3 +
            preimage5to10) as ByteString

        // Hash the preimage.
        const hash = byteString2Int(
            reverseByteString(hash256(preimageNew), 32n) + toByteString('00')
        )

        // Veriy signature against the new sighash using the sCrypt SECP256K1 library.
        assert(
            SECP256K1.verifySig(hash, sig, this.pubKey),
            'signature verification failed'
        )
    }
}
