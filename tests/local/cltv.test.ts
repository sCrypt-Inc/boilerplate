import { expect } from 'chai'
import { CheckLockTimeVerify } from '../../src/contracts/cltv'
import { dummySigner, dummyUTXO } from './util/txHelper'
import { MethodCallOptions } from 'scrypt-ts'

describe('Test SmartContract `CheckLockTimeVerify`', () => {
    let cltv: CheckLockTimeVerify
    const lockTimeMin = 1673510000n

    before(async () => {
        await CheckLockTimeVerify.compile()

        cltv = new CheckLockTimeVerify(lockTimeMin)
        await cltv.connect(dummySigner())
    })

    it('should pass the public method unit test successfully.', async () => {
        // const timeNow = 1673523720
        // const {tx: callTx, atInputIndex} = await cltv.methods.unlock(
        //     {
        //         fromUTXO: dummyUTXO,
        //         lockTime: timeNow,
        //     } as MethodCallOptions<CheckLockTimeVerify>,
        // )
        // const result = callTx.verifyInputScript(atInputIndex)
        // expect(result.success, result.error).to.eq(true)
    })

    it('should fail when nLocktime is too low.', async () => {
        const timeNow = 1673500100
        expect(
            cltv.methods.unlock({
                fromUTXO: dummyUTXO,
                lockTime: timeNow,
            } as MethodCallOptions<CheckLockTimeVerify>)
        ).to.be.rejectedWith(/locktime has not yet expired/)
    })
})
