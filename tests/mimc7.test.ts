import { expect } from 'chai'
import { Mimc7Test } from '../src/contracts/mimc7'
import { getDefaultSigner } from './utils/helper'

describe('Test SmartContract `Mimc7Test`', () => {
    before(() => {
        Mimc7Test.loadArtifact()
    })

    it('should pass the public method unit test successfully.', async () => {
        const mimc7 = new Mimc7Test()
        await mimc7.connect(getDefaultSigner())

        await mimc7.deploy(1)
        const callContract = async () =>
            mimc7.methods.unlock(
                1n,
                2n,
                10594780656576967754230020536574539122676596303354946869887184401991294982664n
            )
        return expect(callContract()).not.rejected
    })
})
