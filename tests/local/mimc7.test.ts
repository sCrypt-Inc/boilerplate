import { expect } from 'chai'
import { Mimc7Test } from '../../src/contracts/mimc7'

describe('Test SmartContract `Mimc7Test`', () => {
    before(async () => {
        await Mimc7Test.compile()
    })

    it('should pass the public method unit test successfully.', async () => {
        const demo = new Mimc7Test()

        const result = demo.verify(() =>
            demo.unlock(
                1n,
                2n,
                10594780656576967754230020536574539122676596303354946869887184401991294982664n
            )
        )
        expect(result.success, result.error).to.eq(true)
    })
})
