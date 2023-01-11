import { expect } from 'chai'
import { Ackermann } from '../../src/contracts/ackermann'

describe('Test SmartContract `Ackermann`', () => {
    before(async () => {
        await Ackermann.compile()
    })

    it('should pass the public method unit test successfully.', async () => {
        const ackermann = new Ackermann(2n, 1n)

        const result = ackermann.verify(() => ackermann.unlock(5n))
        expect(result.success, result.error).to.eq(true)
    })

    it('should throw', async () => {
        const ackermann = new Ackermann(2n, 1n)

        expect(() => {
            ackermann.unlock(4n)
        }).to.throw(/Execution failed/)
    })
})
