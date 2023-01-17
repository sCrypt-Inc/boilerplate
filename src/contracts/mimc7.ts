import { Mimc7 } from 'scrypt-ts-lib'
import { assert, method, SmartContract } from 'scrypt-ts'

export class Mimc7Test extends SmartContract {
    @method()
    public unlock(x: bigint, k: bigint, h: bigint) {
        // call imported library method
        assert(Mimc7.hash(x, k) == h)
    }
}
