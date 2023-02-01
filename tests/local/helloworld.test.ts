import { expect } from 'chai'
import { utf8ToByteString } from 'scrypt-ts'
import { HelloWorld } from '../../src/contracts/helloworld'

describe('Test SmartContract `HelloWorld`', () => {
    before(async () => {
        await HelloWorld.compile()
    })

    it('should pass the public method unit test successfully.', async () => {
        const helloWorld = new HelloWorld()
        const result = helloWorld.verify(() =>
            helloWorld.unlock(utf8ToByteString('hello world'))
        )
        expect(result.success, result.error).to.eq(true)
    })
})
