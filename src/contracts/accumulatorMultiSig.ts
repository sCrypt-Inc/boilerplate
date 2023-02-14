import {
    assert,
    FixedArray,
    hash160,
    method,
    prop,
    PubKey,
    PubKeyHash,
    Sig,
    SmartContract,
} from 'scrypt-ts'

export class AccumulatorMultiSig extends SmartContract {
    // Number of multi sig participants.
    static readonly N = 3

    // Threshold of the signatures needed.
    @prop()
    readonly threshold: bigint

    // Addresses.
    @prop()
    readonly pubKeyHashes: FixedArray<PubKeyHash, typeof AccumulatorMultiSig.N>

    constructor(
        threshold: bigint,
        pubKeyHashes: FixedArray<PubKeyHash, typeof AccumulatorMultiSig.N>
    ) {
        super(...arguments)
        this.threshold = threshold
        this.pubKeyHashes = pubKeyHashes
    }

    @method()
    public main(
        pubKeys: FixedArray<PubKey, typeof AccumulatorMultiSig.N>,
        sigs: FixedArray<Sig, typeof AccumulatorMultiSig.N>,
        masks: FixedArray<boolean, typeof AccumulatorMultiSig.N> // Mask the unused signatures with `false`
    ) {
        let total = 0n
        for (let i = 0; i < AccumulatorMultiSig.N; i++) {
            if (masks[i]) {
                if (
                    // Ensure the public key belongs to the specified address.
                    hash160(pubKeys[i]) == this.pubKeyHashes[i] &&
                    // Check the signature
                    this.checkSig(sigs[i], pubKeys[i])
                ) {
                    total++ // Increment the number of successful signature checks.
                }
            }
        }
        assert(
            total >= this.threshold,
            'the number of signatures does not meet the threshold limit'
        )
    }
}
