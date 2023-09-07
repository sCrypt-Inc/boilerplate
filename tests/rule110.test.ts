import { expect, use } from 'chai'
import { toByteString } from 'scrypt-ts'
import { rule110 } from '../src/contracts/rule110'
import { getDefaultSigner } from './utils/helper'
import chaiAsPromised from 'chai-as-promised'
use(chaiAsPromised)

describe('Test SmartContract `Test`', () => {
    let instance: rule110

    before(async () => {
        await rule110.compile()
        instance = new rule110(toByteString(''))
        await instance.connect(getDefaultSigner())
    })

    it('it should pass the public method play successfully ', async () => {
        await instance.deploy(1)

        const call = async () => {
            await instance.methods.play(2n)
            return expect(call()).not.be.rejected
        }
    })

    it('should throw when calling play method ', async () => {
        await instance.deploy(1)

        const call = async () => {
            await instance.methods.play(0n)
            return expect(call()).to.be.rejectedWith(/play method failed/)
        }
    })
})
