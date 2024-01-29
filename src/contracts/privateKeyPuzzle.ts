import {
    ByteString,
    FixedArray,
    PubKey,
    Sig,
    SigHash,
    SmartContract,
    assert,
    byteString2Int,
    len,
    method,
    prop,
    slice,
} from 'scrypt-ts'

/*
 *  A private key puzzle, which can only be unlocked by providing the private key for a
 *  corresponding public key. This is achieved by re-using the nonce 'k' while signing.
 *
 *  Medium article: https://xiaohuiliu.medium.com/private-key-puzzles-cdb2f05a5fbc
 */
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
        const rlen = byteString2Int(slice(sig, 3n, 4n))
        return slice(sig, 4n, 4n + rlen / 2n)
    }

    @method()
    static extractSigHashFlagFromSig(sig: Sig): ByteString {
        // Extract SIGHASH flag from DER-encoded signature.
        return slice(sig, len(sig) - 1n)
    }

    @method()
    public unlockCodeSep(sigs: FixedArray<Sig, 2>) {
        assert(this.checkSig(sigs[0], this.pubKey))

        // Ensure signed messages are different.
        // Option 1: insert code separator in between two checkSigs.
        this.insertCodeSeparator()
        assert(this.checkSig(sigs[1], this.pubKey))

        // Sign with same `r`, thus same ephemeral key `k`.
        assert(
            PrivateKeyPuzzle.extractRFromSig(sigs[0]) ==
                PrivateKeyPuzzle.extractRFromSig(sigs[1])
        )
    }

    @method()
    public unlockSigHash(sigs: FixedArray<Sig, 2>) {
        assert(this.checkSig(sigs[0], this.pubKey))

        // Ensure signed messages are different.
        // Option 2: use different sig-hash flags.
        const sigHashType = SigHash.ANYONECANPAY_SINGLE
        assert(
            PrivateKeyPuzzle.extractSigHashFlagFromSig(sigs[0]) == sigHashType
        )
        assert(
            PrivateKeyPuzzle.extractSigHashFlagFromSig(sigs[1]) != sigHashType
        )

        // Sign with same `r`, thus same ephemeral key `k`.
        assert(
            PrivateKeyPuzzle.extractRFromSig(sigs[0]) ==
                PrivateKeyPuzzle.extractRFromSig(sigs[1])
        )
    }
}
