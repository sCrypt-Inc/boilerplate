import { Mimc7 } from 'scrypt-ts-lib'
import { assert, method, SmartContract } from 'scrypt-ts'

/*
 * A demonstration on how to use the ZK-friendly hash function MiMC.
 * The function is imported from the "scrypt-ts-lib" package.
 * Read our Medium article for more details:
 * https://medium.com/@xiaohuiliu/zk-friendly-hash-function-mimc-in-bitcoin-1236783d7f64
 */
export class Mimc7Test extends SmartContract {
    @method()
    public unlock(x: bigint, k: bigint, h: bigint) {
        // call imported library method
        assert(Mimc7.hash(x, k) == h)
    }
}
