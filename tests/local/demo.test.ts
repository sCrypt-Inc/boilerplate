import { expect, use } from 'chai'
import { Demo } from '../../src/contracts/demo'
import { MethodCallOptions } from 'scrypt-ts'
import { getDummySigner, getDummyUTXO } from '../utils/helper'
import chaiAsPromised from 'chai-as-promised'

use(chaiAsPromised)

describe('Test SmartContract `Demo`', () => {
    let demo: Demo

    before(async () => {
        await Demo.compile()

        demo = new Demo(-2n, 7n)
        console.log(demo.scriptSize)
        await demo.connect(getDummySigner())
    })

    it('should pass `add`', async () => {
        const { tx: callTx, atInputIndex } = await demo.methods.add(5n, {
            fromUTXO: getDummyUTXO(),
        } as MethodCallOptions<Demo>)
        const result = callTx.verifyScript(atInputIndex)
        expect(result.success, result.error).to.eq(true)
    })

    it('should pass `sub`', async () => {
        const { tx: callTx, atInputIndex } = await demo.methods.sub(-9n, {
            fromUTXO: getDummyUTXO(),
        } as MethodCallOptions<Demo>)
        const result = callTx.verifyScript(atInputIndex)
        expect(result.success, result.error).to.eq(true)
    })

    it('should throw when calling `add`', () => {
        return expect(
            demo.methods.add(-5n, {
                fromUTXO: getDummyUTXO(),
            } as MethodCallOptions<Demo>)
        ).to.be.rejectedWith(/add check failed/)
    })

    it('should throw when calling `sub`', () => {
        return expect(
            demo.methods.sub(9n, {
                fromUTXO: getDummyUTXO(),
            } as MethodCallOptions<Demo>)
        ).to.be.rejectedWith(/sub check failed/)
    })
})
