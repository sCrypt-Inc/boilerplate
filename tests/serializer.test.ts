import { expect, use } from 'chai'
import {
    MethodCallOptions,
    PubKey,
    findSig,
    toByteString,
    toHex,
} from 'scrypt-ts'
import { STest } from '../src/contracts/serializer'
import { getDefaultSigner } from './utils/helper'
import chaiAsPromised from 'chai-as-promised'
import { myPublicKey } from './utils/privateKey'
use(chaiAsPromised)

describe('Test SmartContract `Serializer`', () => {
    let instance: STest

    before(async () => {
        await STest.compile()
        instance = new STest()
        await instance.connect(getDefaultSigner())
    })

    it('it should pass the public method testBool successfully ', async () => {
        await instance.deploy(1)

        const call = async () => {
            await instance.methods.testBool(true)
            return expect(call()).not.be.rejected
        }
    })

    it('it should pass the public method testBytes successfully ', async () => {
        await instance.deploy(1)

        const call = async () => {
            await instance.methods.testBytes(toByteString(''))
            return expect(call()).not.be.rejected
        }
    })

    it('it should pass the public method testInt successfully ', async () => {
        await instance.deploy(1)

        const call = async () => {
            await instance.methods.testInt(2n)
            return expect(call()).not.be.rejected
        }
    })

    it('it should pass the public method main successfully ', async () => {
        await instance.deploy(1)

        const call = async () => {
            await instance.methods.main(true, toByteString(''), 2n)
            return expect(call()).not.be.rejected
        }
    })

    it('should throw when calling testBool method ', async () => {
        await instance.deploy(1)

        const call = async () => {
            await instance.methods.testBool(false)
            return expect(call()).to.be.rejectedWith(/testBool method failed/)
        }
    })

    it('should throw when calling testBytes method ', async () => {
        await instance.deploy(1)

        const call = async () => {
            await instance.methods.testBytes(0n)
            return expect(call()).to.be.rejectedWith(/testBytes method failed/)
        }
    })

    it('should throw when calling testInt method ', async () => {
        await instance.deploy(1)

        const call = async () => {
            await instance.methods.testInt(0n)
            return expect(call()).to.be.rejectedWith(/testInt method failed/)
        }
    })

    it('should throw when calling main method ', async () => {
        await instance.deploy(1)

        const call = async () => {
            await instance.methods.main(false, toByteString(''), 2n)
            return expect(call()).to.be.rejectedWith(/main method failed/)
        }
    })
})
