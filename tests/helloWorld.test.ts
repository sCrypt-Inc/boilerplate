import { expect, use } from 'chai'
import { sha256, toByteString } from 'scrypt-ts'
import { HelloWorld } from '../src/contracts/helloWorld'
import { getDefaultSigner } from './utils/helper'
import chaiAsPromised from 'chai-as-promised'

use(chaiAsPromised)

describe('Test SmartContract `HelloWorld`', () => {
    let helloWorld: HelloWorld

    before(async () => {
        await HelloWorld.compile()
        helloWorld = new HelloWorld(sha256(toByteString('hello world', true)))
        await helloWorld.connect(getDefaultSigner())
    })

    it('should pass the public method unit test successfully.', async () => {
        const deployTx = await helloWorld.deploy(1)
        console.log('HelloWorld contract deployed: ', deployTx.id)

        const { tx: callTx, atInputIndex } = await helloWorld.methods.unlock(
            toByteString('hello world', true)
        )
        console.log('HelloWorld contract called: ', callTx.id)

        const result = callTx.verifyScript(atInputIndex)
        expect(result.success, result.error).to.eq(true)
    })

    it('should throw with wrong message.', async () => {
        const deployTx = await helloWorld.deploy(1)
        console.log('HelloWorld contract deployed: ', deployTx.id)

        return expect(
            helloWorld.methods.unlock(toByteString('wrong message', true))
        ).to.be.rejectedWith(/Not expected message!/)
    })
})
