import { expect, use } from 'chai'
import { ModExp } from '../src/contracts/modEXP'
import { getDefaultSigner } from './utils/helper'
import chaiAsPromised from 'chai-as-promised'
import { describe } from 'mocha'

use(chaiAsPromised)

describe('Test SmartContract `modEXP`', () => {
    let instance: ModExp
    before(async () => {
        ModExp.loadArtifact()

        instance = new ModExp(13n)
        await instance.connect(getDefaultSigner())
    })

    it('should pass the public method unit test successfully.', async () => {
        const deployTx = await instance.deploy(1)
        console.log('modEXP contract deployed: ', deployTx.id)

        const callContract = async () => instance.methods.main(2n, 3n, 8n)

        return expect(callContract()).not.rejected
    })

    it('should fail with wrong x.', async () => {
        const deployTx = await instance.deploy(1)
        console.log('modEXP contract deployed: ', deployTx.id)

        const callContract = async () => instance.methods.main(12n, 3n, 8n)

        return expect(callContract()).to.be.rejectedWith(/Execution failed/)
    })
})
