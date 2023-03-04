import { assert, method, prop, SmartContract } from 'scrypt-ts'

export class Demo extends SmartContract {
    @prop()
    readonly x: bigint

    @prop()
    readonly y: bigint

    // The values of the x and y properties get passed via the
    // smart contract's constructor.
    constructor(x: bigint, y: bigint) {
        super(...arguments)
        this.x = x
        this.y = y
    }

    // Contract internal method to compute x + y
    @method()
    sum(a: bigint, b: bigint): bigint {
        return a + b
    }

    // Public method which can be unlocked by providing the solution to x + y
    @method()
    public add(z: bigint) {
        assert(z == this.sum(this.x, this.y), 'add check failed')
    }

    // Public method which can be unlocked by providing the solution to x - y
    @method()
    public sub(z: bigint) {
        assert(z == this.x - this.y, 'sub check failed')
    }
}
