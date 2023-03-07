import { expect, use } from 'chai'
import { MethodCallOptions, sha256, toByteString } from 'scrypt-ts'
import { HelloWorld } from '../../src/contracts/helloWorld'
import { getDummySigner, getDummyUTXO } from '../utils/helper'
import chaiAsPromised from 'chai-as-promised'

use(chaiAsPromised)

describe('Test SmartContract `HelloWorld`', () => {
    let helloWorld: HelloWorld

    before(async () => {
        await HelloWorld.compile()
        helloWorld = new HelloWorld(sha256(toByteString('hello world', true)))
        await helloWorld.connect(getDummySigner())
    })

    it('should pass the public method unit test successfully.', async () => {
        const { tx: callTx, atInputIndex } = await helloWorld.methods.unlock(
            toByteString('hello world', true),
            {
                fromUTXO: getDummyUTXO(),
            } as MethodCallOptions<HelloWorld>
        )

        const result = callTx.verifyScript(atInputIndex)
        expect(result.success, result.error).to.eq(true)
    })

    it('should throw with wrong message.', async () => {
        return expect(
            helloWorld.methods.unlock(toByteString('wrong message', true), {
                fromUTXO: getDummyUTXO(),
            } as MethodCallOptions<HelloWorld>)
        ).to.be.rejectedWith(/Not expected message!/)
    })
})
