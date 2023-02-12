import { expect, use } from 'chai'
import { Demo } from '../../src/contracts/demo'
import { MethodCallOptions } from 'scrypt-ts'
import { dummySigner, dummyUTXO } from './util/txHelper'
import chaiAsPromised from 'chai-as-promised'

use(chaiAsPromised)

describe('Test SmartContract `Demo`', () => {
    let demo: Demo

    before(async () => {
        await Demo.compile()
        demo = new Demo(-2n, 7n)

        await demo.connect(dummySigner())
    })

    it('should pass `add`', async () => {
        const { tx: callTx, atInputIndex } = await demo.methods.add(5n, {
            fromUTXO: dummyUTXO,
        } as MethodCallOptions<Demo>)
        const result = callTx.verifyInputScript(atInputIndex)
        expect(result.success, result.error).to.eq(true)
    })

    it('should pass `sub`', async () => {
        const { tx: callTx, atInputIndex } = await demo.methods.sub(-9n, {
            fromUTXO: dummyUTXO,
        } as MethodCallOptions<Demo>)
        const result = callTx.verifyInputScript(atInputIndex)
        expect(result.success, result.error).to.eq(true)
    })

    it('should throw', () => {
        expect(demo.methods.add(-5n)).to.be.rejectedWith(/add check failed/)
        expect(demo.methods.sub(9n)).to.be.rejectedWith(/sub check failed/)
    })
})
