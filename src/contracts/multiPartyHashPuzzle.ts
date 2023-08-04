import {
    assert,
    FixedArray,
    ByteString,
    method,
    prop,
    Sha256,
    SmartContract,
    sha256,
} from 'scrypt-ts'

export type HashArray = FixedArray<Sha256, typeof MultiPartyHashPuzzle.N>
export type PreimageArray = FixedArray<
    ByteString,
    typeof MultiPartyHashPuzzle.N
>

/*
 * A hash puzzle contract that can be unlocked using the preimages
 * of the hashes.
 */
export class MultiPartyHashPuzzle extends SmartContract {
    static readonly N = 10

    @prop()
    readonly hashes: HashArray

    constructor(hashes: HashArray) {
        super(...arguments)
        this.hashes = hashes
    }

    @method()
    public unlock(preimages: PreimageArray) {
        for (let i = 0; i < MultiPartyHashPuzzle.N; i++) {
            assert(sha256(preimages[i]) == this.hashes[i], 'hash mismatch')
        }
    }
}
