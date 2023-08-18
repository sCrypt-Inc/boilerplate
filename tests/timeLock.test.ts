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
        const deployTx = await timeLock.deploy(1)
        console.log('TimeLock contract deployed: ', deployTx.id)

        const { tx: callTx, atInputIndex } = await timeLock.methods.unlock({
            lockTime: 1673523720,
        } as MethodCallOptions<TimeLock>)
        console.log('TimeLock contract called: ', callTx.id)
        const result = callTx.verifyScript(atInputIndex)
        expect(result.success, result.error).to.eq(true)
    })

    it('should fail when nLocktime is too low.', async () => {
        const deployTx = await timeLock.deploy(1)
        console.log('TimeLock contract deployed: ', deployTx.id)
        return expect(
            timeLock.methods.unlock({
                lockTime: 1673500100,
            } as MethodCallOptions<TimeLock>)
        ).to.be.rejectedWith(/locktime has not yet expired/)
    })
})
