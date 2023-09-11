import {
    assert,
    FixedArray,
    method,
    prop,
    PubKey,
    Addr,
    Sig,
    SmartContract,
    pubKey2Addr,
} from 'scrypt-ts'

// Read Medium article about this contract:
// https://medium.com/@xiaohuiliu/accumulator-multisig-d5a5a1b5fc42
export class AccumulatorMultiSig extends SmartContract {
    // Number of multi sig participants.
    static readonly N = 3

    // Threshold of the signatures needed.
    @prop()
    readonly threshold: bigint

    // Addresses.
    @prop()
    readonly addresses: FixedArray<Addr, typeof AccumulatorMultiSig.N>

    constructor(
        threshold: bigint,
        addresses: FixedArray<Addr, typeof AccumulatorMultiSig.N>
    ) {
        super(...arguments)
        this.threshold = threshold
        this.addresses = addresses
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
                    pubKey2Addr(pubKeys[i]) == this.addresses[i] &&
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
