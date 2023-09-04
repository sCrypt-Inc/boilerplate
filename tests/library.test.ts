import { expect, use } from 'chai'
import { Test } from '../src/contracts/library'
import { L } from '../src/contracts/library'
import { getDefaultSigner } from './utils/helper'
import chaiAsPromised from 'chai-as-promised'
use(chaiAsPromised)

describe('Test SmartContract `Test`', () => {
    let instance: Test
    const l = new L(2n, 3n)

    before(async () => {
        Test.loadArtifact()
        instance = new Test(2n, l)
        await instance.connect(getDefaultSigner())
    })

    it('should pass the public method unit test successfully.', async () => {
        const deployTx = await instance.deploy(1)
        console.log(' Library Test contract deployed: ', deployTx.id)

        const callContract = async () => {
            await instance.methods.unlock(3n)
            expect(callContract()).not.throw
        }
    })
})
