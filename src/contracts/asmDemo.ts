import { assert, method, prop, SmartContract } from 'scrypt-ts'

export class AsmDemo extends SmartContract {
    @prop()
    x: bigint

    constructor(x: bigint) {
        super(...arguments)
        this.x = x
    }

    @method()
    public unlock(a: bigint, b: bigint) {
        // Body will be replaced by inline ASM during building of the project.
        // Check artifacts/src/contracts/asm.scrypt
        assert(a + b > this.x)
    }
}
