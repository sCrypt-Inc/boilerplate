import { expect, use } from 'chai'
import { TimeLock } from '../src/contracts/timeLock'
import { getDefaultSigner } from './utils/helper'
import { MethodCallOptions } from 'scrypt-ts'
import chaiAsPromised from 'chai-as-promised'
use(chaiAsPromised)

describe('Test SmartContract `TimeLock`', () => {
    let timeLock: TimeLock
    const lockTimeMin = 1673510000n

    before(async () => {
        await TimeLock.compile()

        timeLock = new TimeLock(lockTimeMin)
        await timeLock.connect(getDefaultSigner())
    })

    it('should pass the public method unit test successfully.', async () => {
        await timeLock.deploy(1)
        const callContract = async () =>
            await timeLock.methods.unlock({
                lockTime: 1673523720,
            } as MethodCallOptions<TimeLock>)
        expect(callContract()).not.throw
    })

    it('should fail when nLocktime is too low.', async () => {
        await timeLock.deploy(1)
        const callContract = async () =>
            await timeLock.methods.unlock({
                lockTime: 1673500100,
            } as MethodCallOptions<TimeLock>)
        return expect(callContract()).to.be.rejectedWith(
            /locktime has not yet expired/
        )
    })
})
