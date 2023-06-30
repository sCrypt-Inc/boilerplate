import {
    ByteString,
    FixedArray,
    PubKey,
    Sig,
    SmartContract,
    assert,
    byteString2Int,
    len,
    method,
    prop,
} from 'scrypt-ts'

export class PrivateKeyPuzzle extends SmartContract {
    @prop()
    pubKey: PubKey

    constructor(pubKey: PubKey) {
        super(...arguments)
        this.pubKey = pubKey
    }

    @method()
    static extractRFromSig(sig: Sig): ByteString {
        // Extract `r` from DER-encoded signature.
        const rlen = byteString2Int(sig.slice(6, 8))
        return sig.slice(8, Number(8n + rlen))
    }

    @method()
    static extractSigHashFlagFromSig(sig: Sig): bigint {
        // Extract SIGHASH flag from DER-encoded signature.
        const l = len(sig) * 2n
        const res = byteString2Int(sig.slice(Number(l - 2n)))
        return res
    }

    @method()
    public unlock(sigs: FixedArray<Sig, 2>) {
        assert(this.checkSig(sigs[0], this.pubKey))

        // Ensure signed messages are different.
        // Option 1: insert code separator in between two checkSigs.
        this.insertCodeSeparator()
        assert(this.checkSig(sigs[1], this.pubKey))

        // Ensure signed messages are different.
        // Option 2: use different sig-hash flags.
        const sigHashNone = 66n // TODO: Use builtin?
        assert(
            PrivateKeyPuzzle.extractSigHashFlagFromSig(sigs[0]) == sigHashNone
        )
        assert(
            PrivateKeyPuzzle.extractSigHashFlagFromSig(sigs[1]) != sigHashNone
        )

        // Sign with same `r`, thus same ephemeral key `k`.
        assert(
            PrivateKeyPuzzle.extractRFromSig(sigs[0]) ==
                PrivateKeyPuzzle.extractRFromSig(sigs[1])
        )
    }
}
