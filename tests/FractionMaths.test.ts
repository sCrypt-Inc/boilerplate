import { expect, use } from 'chai'
import { FRMathTest } from '../src/contracts/fractionMaths'
import { getDefaultSigner } from './utils/helper'
import chaiAsPromised from 'chai-as-promised'
use(chaiAsPromised)

describe('Test SmartContract `FractionMaths`', () => {
    let instance: FRMathTest

    before(async () => {
        await FRMathTest.compile()
        instance = new FRMathTest()
        await instance.connect(getDefaultSigner())
    })

    it('should unlock correctly', async () => {
        await instance.deploy(1)
        const x = { n: 1n, d: 2n }
        const y = { n: 1n, d: 3n }
        const z = { n: 5n, d: 6n }

        const call = async () => instance.methods.unlock(x, y, z, 0n, false)

        await expect(call()).not.to.be.rejected
    })

    it('should unlockScaled correctly', async () => {
        await instance.deploy(1)
        const x = { n: 1n, d: 2n }
        const y = { n: 1n, d: 3n }
        const s = 2n
        const sr = 10n
        const call = async () =>
            instance.methods.unlockScaled(s, x, y, 0n, false, sr)

        await expect(call()).not.to.be.rejected
    })
})
