import {
    assert,
    ByteString,
    method,
    prop,
    sha256,
    Sha256,
    SmartContract,
} from 'scrypt-ts'

/*
 * A "hello world" example of an sCrypt smart contract.
 * The deployed smart contract can be unlocked by providing
 * the hash preimage of the hash value, specified upon deployment.
 * Such a contract is ofter referred to as a "hash puzzle".
 */
export class HelloWorld extends SmartContract {
    @prop()
    hash: Sha256

    constructor(hash: Sha256) {
        super(...arguments)
        this.hash = hash
    }

    // This method can only be unlocked if providing the real hash preimage of
    // the specified SHA-256 hash.
    @method()
    public unlock(message: ByteString) {
        assert(this.hash === sha256(message), 'Not expected message!')
    }
}
