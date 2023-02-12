import {
    assert,
    checkMultiSig,
    FixedArray,
    hash160,
    method,
    prop,
    PubKey,
    PubKeyHash,
    Sig,
    SmartContract,
} from 'scrypt-ts'

export class MultiSig extends SmartContract {
    // Number of key total.
    static readonly N = 3

    // Public key hashes.
    @prop()
    readonly pubKeyHashes: FixedArray<PubKeyHash, typeof MultiSig.N>

    constructor(pubKeyHashes: FixedArray<PubKeyHash, typeof MultiSig.N>) {
        super(...arguments)
        this.pubKeyHashes = pubKeyHashes
    }

    @method()
    public unlock(
        sigs: FixedArray<Sig, typeof MultiSig.N>,
        pubKeys: FixedArray<PubKey, typeof MultiSig.N>
    ) {
        // Check if public keys hash to the right addresses.
        for (let i = 0; i < MultiSig.N; i++) {
            assert(
                hash160(pubKeys[i]) == this.pubKeyHashes[i],
                'public key hashes are not equal'
            )
        }

        assert(checkMultiSig(sigs, pubKeys), 'Check multisig failed')
    }
}
