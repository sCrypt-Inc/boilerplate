import {
    assert,
    ByteString,
    method,
    prop,
    Sha256,
    sha256,
    SmartContract,
} from 'scrypt-ts'

export class HashPuzzle extends SmartContract {
    @prop()
    readonly sha256: Sha256

    constructor(sha256: Sha256) {
        super(...arguments)
        this.sha256 = sha256
    }

    // This method can only be unlocked if providing the real hash preimage of
    // the specified SHA-256 hash.
    @method()
    public unlock(data: ByteString) {
        assert(this.sha256 == sha256(data), 'hashes are not equal')
    }
}
