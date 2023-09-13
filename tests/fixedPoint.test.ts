import { FPTest } from '../src/contracts/fixedPoint'
import { getDefaultSigner } from './utils/helper'
import { expect, use } from 'chai'
import chaiAsPromised from 'chai-as-promised'
use(chaiAsPromised)

async function main() {
    await FPTest.compile()

    const instance = new FPTest()

    await instance.connect(getDefaultSigner())

    it('should unlock correctly ', async () => {
        await instance.deploy(1)

        const callContract = async () => {
            await instance.methods.unlock(10n, 20, 30, 0n, 50n)
            return expect(callContract()).not.be.rejected
        }
    })
}
describe('Test SmartContract `FixedPoint`', async () => {
    await main()
})
