import { expect } from 'chai'
import { Mimc7Test } from '../../src/contracts/mimc7'
import { getDummySigner, getDummyUTXO } from '../utils/helper'
import { MethodCallOptions } from 'scrypt-ts'

describe('Test SmartContract `Mimc7Test`', () => {
    before(async () => {
        await Mimc7Test.compile()
    })

    it('should pass the public method unit test successfully.', async () => {
        const mimc7 = new Mimc7Test()
        await mimc7.connect(getDummySigner())

        const { tx: callTx, atInputIndex } = await mimc7.methods.unlock(
            1n,
            2n,
            10594780656576967754230020536574539122676596303354946869887184401991294982664n,
            {
                fromUTXO: getDummyUTXO(),
            } as MethodCallOptions<Mimc7Test>
        )

        const result = callTx.verifyScript(atInputIndex)
        expect(result.success, result.error).to.eq(true)
    })
})
