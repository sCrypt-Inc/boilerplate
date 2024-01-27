import { SmartContract, method, prop, assert } from 'scrypt-ts'

export class Demo extends SmartContract {
    @prop()
    sum: bigint

    @prop()
    diff: bigint

    // The values of the `sum` and `diff` properties get passed via the
    // smart contract's constructor.
    constructor(sum: bigint, diff: bigint) {
        super(...arguments)
        this.sum = sum
        this.diff = diff
    }

    // Public method which can be unlocked by providing the solution `x` and `y`
    // for the two equations `x + y = summ` and `x - y = diff`.
    @method()
    public unlock(x: bigint, y: bigint) {
        assert(Demo.add(x, y) == this.sum, 'incorrect sum')
        assert(x - y == this.diff, 'incorrect diff')
    }

    // Non-public methods cannot be directly called and are intended for internal use within the contract.
    @method()
    static add(x: bigint, y: bigint): bigint {
        return x + y
    }
}
