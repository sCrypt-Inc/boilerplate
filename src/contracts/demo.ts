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

    //  Public method which can be unlocked by providing the solution `x` and `y`
    //  for the two equations `x + y = summ` and `x - y = diff`.
    @method()
    public unlock(x: bigint, y: bigint) {
        assert(x + y == this.sum, 'incorrect sum')
        assert(x - y == this.diff, 'incorrect diff')
    }
}
