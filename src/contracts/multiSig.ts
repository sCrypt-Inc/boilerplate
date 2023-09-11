import {
    assert,
    method,
    prop,
    PubKey,
    Addr,
    Sig,
    SmartContract,
    FixedArray,
    pubKey2Addr,
} from 'scrypt-ts'

/*
 * A simple multi-sig payment, that can be unlocked using three signatures.
 * Under the hood, the signatures get validated by OP_CHECKMULTISIG.
 */
export class MultiSigPayment extends SmartContract {
    // Public key hashes of the 3 recipients
    @prop()
    readonly addresses: FixedArray<Addr, 3>

    constructor(addresses: FixedArray<Addr, 3>) {
        super(...arguments)
        this.addresses = addresses
    }

    @method()
    public unlock(
        signatures: FixedArray<Sig, 3>,
        publicKeys: FixedArray<PubKey, 3>
    ) {
        // Check if the passed public keys belong to the specified public key hashes.
        for (let i = 0; i < 3; i++) {
            assert(
                pubKey2Addr(publicKeys[i]) == this.addresses[i],
                'public key hash mismatch'
            )
        }

        // Validate signatures.
        assert(
            this.checkMultiSig(signatures, publicKeys),
            'checkMultiSig failed'
        )
    }
}
