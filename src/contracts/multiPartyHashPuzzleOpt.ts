import {
    assert,
    FixedArray,
    ByteString,
    method,
    prop,
    Sha256,
    SmartContract,
    sha256,
    toByteString,
} from 'scrypt-ts'

type PreimageArray = FixedArray<ByteString, typeof MultiPartyHashPuzzleOpt.N>

/*
 * A hash puzzle contract that can be unlocked using the preimages
 * of the hashes.
 */
export class MultiPartyHashPuzzleOpt extends SmartContract {
    static readonly N = 10

    @prop()
    readonly combinedHash: Sha256

    constructor(combinedHash: Sha256) {
        super(...arguments)
        this.combinedHash = combinedHash
    }

    @method()
    public unlock(preimages: PreimageArray) {
        let combinedHash: ByteString = toByteString('')
        for (let i = 0; i < MultiPartyHashPuzzleOpt.N; i++) {
            combinedHash = sha256(combinedHash + preimages[i])
        }
        assert(combinedHash == this.combinedHash, 'hash mismatch')
    }
}
