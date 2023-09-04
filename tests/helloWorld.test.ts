import { expect, use } from 'chai'
import { sha256, toByteString } from 'scrypt-ts'
import { HelloWorld } from '../src/contracts/helloWorld'
import { getDefaultSigner } from './utils/helper'
import chaiAsPromised from 'chai-as-promised'

use(chaiAsPromised)

describe('Test SmartContract `HelloWorld`', () => {
    let helloWorld: HelloWorld

    before(async () => {
        HelloWorld.loadArtifact()
        helloWorld = new HelloWorld(sha256(toByteString('hello world', true)))
        await helloWorld.connect(getDefaultSigner())
    })

    it('should pass the public method unit test successfully.', async () => {
        await helloWorld.deploy(1)
        const callContract = async () =>
            helloWorld.methods.unlock(toByteString('hello world', true))
        return expect(callContract()).not.rejected
    })

    it('should throw with wrong message.', async () => {
        await helloWorld.deploy(1)
        const callContract = async () =>
            helloWorld.methods.unlock(toByteString('wrong message', true))
        return expect(callContract()).to.be.rejectedWith(
            /Not expected message!/
        )
    })
})
