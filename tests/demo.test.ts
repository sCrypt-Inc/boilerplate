import { expect, use } from 'chai'
import { Demo } from '../src/contracts/demo'
import { getDefaultSigner } from './utils/helper'
import chaiAsPromised from 'chai-as-promised'

use(chaiAsPromised)

describe('Test SmartContract `Demo`', () => {
    let demo: Demo

    before(async () => {
        await Demo.compile()

        demo = new Demo(-2n, 7n)
        await demo.connect(getDefaultSigner())
    })

    it('should pass `add`', async () => {
        const deployTx = await demo.deploy(1)
        console.log('Demo contract deployed: ', deployTx.id)

        const { tx: callTx, atInputIndex } = await demo.methods.add(5n)
        console.log('Demo contract called: ', callTx.id)
        const result = callTx.verifyScript(atInputIndex)
        expect(result.success, result.error).to.eq(true)
    })

    it('should pass `sub`', async () => {
        const deployTx = await demo.deploy(1)
        console.log('Demo contract deployed: ', deployTx.id)

        const { tx: callTx, atInputIndex } = await demo.methods.sub(-9n)
        console.log('Demo contract called: ', callTx.id)
        const result = callTx.verifyScript(atInputIndex)
        expect(result.success, result.error).to.eq(true)
    })

    it('should throw when calling `add`', async () => {
        const deployTx = await demo.deploy(1)
        console.log('Demo contract deployed: ', deployTx.id)

        return expect(demo.methods.add(-5n)).to.be.rejectedWith(
            /add check failed/
        )
    })

    it('should throw when calling `sub`', async () => {
        const deployTx = await demo.deploy(1)
        console.log('Demo contract deployed: ', deployTx.id)

        return expect(demo.methods.sub(9n)).to.be.rejectedWith(
            /sub check failed/
        )
    })
})
