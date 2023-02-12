import { Ackermann } from '../../src/contracts/ackermann'
import { expect, use } from 'chai'
import chaiAsPromised from 'chai-as-promised'
import { dummySigner, dummyUTXO } from './util/txHelper'
import { MethodCallOptions } from 'scrypt-ts'

use(chaiAsPromised)

describe('Test SmartContract `Ackermann`', () => {
    let ackermann: Ackermann

    before(async () => {
        await Ackermann.compile()
        ackermann = new Ackermann(2n, 1n)

        await ackermann.connect(dummySigner())
    })

    it('should transpile contract `Ackermann` successfully.', async () => {
        const { tx: callTx, atInputIndex } = await ackermann.methods.unlock(
            5n,
            {
                fromUTXO: dummyUTXO,
            } as MethodCallOptions<Ackermann>
        )
        const result = callTx.verifyInputScript(atInputIndex)
        expect(result.success, result.error).to.eq(true)
    })

    it('should throw', async () => {
        expect(
            ackermann.methods.unlock(4n, {
                fromUTXO: dummyUTXO,
            } as MethodCallOptions<Ackermann>)
        ).to.be.rejectedWith(/Wrong solution/)
    })
})
