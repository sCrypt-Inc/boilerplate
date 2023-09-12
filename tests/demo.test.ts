import { expect, use } from 'chai'
import { Demo } from '../src/contracts/demo'
import { getDefaultSigner } from './utils/helper'
import chaiAsPromised from 'chai-as-promised'

// https://www.chaijs.com/plugins/chai-as-promised/
// https://stackoverflow.com/a/40842060
use(chaiAsPromised)

describe('Test SmartContract `Demo`', () => {
    let demo: Demo

    before(async () => {
        Demo.loadArtifact()

        demo = new Demo(10n, -4n)
        await demo.connect(getDefaultSigner())
    })

    it('should pass `unlock` with correct solution', async () => {
        await demo.deploy(1)
        const callContract = async () => demo.methods.unlock(3n, 7n)
        return expect(callContract()).not.rejected
    })

    it('should throw when calling `unlock` with wrong solution', async () => {
        await demo.deploy(1)
        const callContract = async () => demo.methods.unlock(4n, 6n)
        return expect(callContract()).to.be.rejectedWith(/incorrect diff/)
    })
})
