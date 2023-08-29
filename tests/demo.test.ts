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
        await demo.deploy(1)
        const callContract = async () => await demo.methods.add(5n)
        expect(callContract()).not.throw
    })

    it('should pass `sub`', async () => {
        await demo.deploy(1)

        const callContract = async () => await demo.methods.sub(-9n)
        expect(callContract()).not.throw
    })

    it('should throw when calling `add`', async () => {
        await demo.deploy(1)
        const callContract = async () => await demo.methods.add(-5n)
        return expect(callContract()).to.be.rejectedWith(/add check failed/)
    })

    it('should throw when calling `sub`', async () => {
        await demo.deploy(1)
        const callContract = async () => await demo.methods.sub(9n)
        return expect(callContract()).to.be.rejectedWith(/sub check failed/)
    })
})
