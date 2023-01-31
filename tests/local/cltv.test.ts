import { expect } from 'chai'
import { CheckLockTimeVerify } from '../../src/contracts/cltv'
import { dummyUTXO } from './util/txHelper'

describe('Test SmartContract `CheckLockTimeVerify`', () => {
    before(async () => {
        await CheckLockTimeVerify.compile()
    })

    it('should pass the public method unit test successfully.', async () => {
        const inputSatoshis = 1000
        const inputIndex = 0
        const lockTimeMin = 1673510000n
        const timeNow = 1673523720

        const cltv = new CheckLockTimeVerify(lockTimeMin)

        const deployTx = cltv.getDeployTx([dummyUTXO], inputSatoshis)

        const callTx = cltv.getCallTxForUnlock(timeNow, deployTx)
        callTx.seal()

        const result = callTx.verifyInputScript(inputIndex)
        expect(result.success, result.error).to.eq(true)
    })

    it('should fail when nLocktime is too low.', async () => {
        const inputSatoshis = 1000
        const inputIndex = 0
        const lockTimeMin = 1673510000n
        const timeNow = 1673500100

        const cltv = new CheckLockTimeVerify(lockTimeMin)

        const deployTx = cltv.getDeployTx([dummyUTXO], inputSatoshis)

        expect(() => {
            const callTx = cltv.getCallTxForUnlock(timeNow, deployTx)
            callTx.seal()
            callTx.verifyInputScript(inputIndex)
        }).to.throw(/Execution failed/)
    })
})
