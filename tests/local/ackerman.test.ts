import { Ackermann } from '../../src/contracts/ackermann'
import { expect, use } from 'chai'
import chaiAsPromised from 'chai-as-promised'
import { getDummySigner, getDummyUTXO } from '../utils/helper'
import { MethodCallOptions } from 'scrypt-ts'

use(chaiAsPromised)

describe('Test SmartContract `Ackermann`', () => {
    let ackermann: Ackermann

    before(async () => {
        await Ackermann.compile()
        ackermann = new Ackermann(2n, 1n)

        await ackermann.connect(getDummySigner())
    })

    it('should transpile contract `Ackermann` successfully.', async () => {
        const { tx: callTx, atInputIndex } = await ackermann.methods.unlock(
            5n,
            {
                fromUTXO: getDummyUTXO(),
            } as MethodCallOptions<Ackermann>
        )
        const result = callTx.verifyScript(atInputIndex)
        expect(result.success, result.error).to.eq(true)
    })

    it('should throw', async () => {
        return expect(
            ackermann.methods.unlock(4n, {
                fromUTXO: getDummyUTXO(),
            } as MethodCallOptions<Ackermann>)
        ).to.be.rejectedWith(/Wrong solution/)
    })
})
