import { assert, method, prop, SmartContract } from 'scrypt-ts'

/*
 * The following contracts unlock method can only be called after the
 * maturation time has passed. It ensures this by constraining the value
 * of nLocktime (and nSequence) in the unlocking transaction.
 */
export class TimeLock extends SmartContract {
    @prop()
    readonly matureTime: bigint // Can be a timestamp or block height.

    constructor(matureTime: bigint) {
        super(...arguments)
        this.matureTime = matureTime
    }

    @method()
    public unlock() {
        assert(this.timeLock(this.matureTime), 'time lock not yet expired')
    }
}
