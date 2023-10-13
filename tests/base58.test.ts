import { toByteString } from 'scrypt-ts'
import { Base58Test } from '../src/contracts/base58'
import { getDefaultSigner } from './utils/helper'
import { expect, use } from 'chai'
import chaiAsPromised from 'chai-as-promised'
use(chaiAsPromised)

describe('Test SmartContract `Base58`', async () => {
    let instance: Base58Test

    before(async () => {
        await Base58Test.loadArtifact()
        instance = new Base58Test()
        await instance.connect(getDefaultSigner())
    })

    it('should encode address correctly', async () => {
        await instance.deploy(1)
        const callContract = async () => {
            await instance.methods.main(toByteString('1234567890abcdef', true))
        }
        return expect(callContract()).not.be.rejected
    })
})
