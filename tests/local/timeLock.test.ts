import { expect } from 'chai'
import { TimeLock } from '../../src/contracts/timeLock'
import { getDummySigner, getDummyUTXO } from '../utils/helper'
import { MethodCallOptions } from 'scrypt-ts'

describe('Test SmartContract `TimeLock`', () => {
    let timeLock: TimeLock
    const lockTimeMin = 1673510000n

    before(async () => {
        await TimeLock.compile()

        timeLock = new TimeLock(lockTimeMin)
        await timeLock.connect(getDummySigner())
    })

    it('should pass the public method unit test successfully.', async () => {
        const { tx: callTx, atInputIndex } = await timeLock.methods.unlock({
            fromUTXO: getDummyUTXO(),
            lockTime: 1673523720,
        } as MethodCallOptions<TimeLock>)
        const result = callTx.verifyScript(atInputIndex)
        expect(result.success, result.error).to.eq(true)
    })

    it('should fail when nLocktime is too low.', async () => {
        return expect(
            timeLock.methods.unlock({
                fromUTXO: getDummyUTXO(),
                lockTime: 1673500100,
            } as MethodCallOptions<TimeLock>)
        ).to.be.rejectedWith(/locktime has not yet expired/)
    })
})
