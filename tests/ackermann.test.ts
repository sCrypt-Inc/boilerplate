import { Ackermann } from '../src/contracts/ackermann'
import { expect, use } from 'chai'
import chaiAsPromised from 'chai-as-promised'
import { getDefaultSigner } from './utils/helper'

use(chaiAsPromised)

describe('Test SmartContract `Ackermann`', () => {
    let ackermann: Ackermann

    before(async () => {
        await Ackermann.compile()
        ackermann = new Ackermann(2n, 1n)

        await ackermann.connect(getDefaultSigner())
    })

    it('should transpile contract `Ackermann` successfully.', async () => {
        await ackermann.deploy(1)
        const callContract = async () => await ackermann.methods.unlock(5n)
        expect(callContract()).not.throw
    })

    it('should throw', async () => {
        await ackermann.deploy(1)
        const callContract = async () => await ackermann.methods.unlock(4n)
        return expect(callContract()).to.be.rejectedWith(/Wrong solution/)
    })
})
