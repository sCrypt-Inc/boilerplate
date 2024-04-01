import { expect, use } from 'chai'
import { Enum, Status } from '../src/contracts/enum'
import { getDefaultSigner } from './utils/helper'
import { MethodCallOptions } from 'scrypt-ts'
import chaiAsPromised from 'chai-as-promised'
use(chaiAsPromised)

describe('Test SmartContract `Enum`', () => {
    before(() => {
        Enum.loadArtifact()
    })

    it('should pass the public method unit test successfully.', async () => {
        const balance = 1

        const instance = new Enum()
        await instance.connect(getDefaultSigner())

        await instance.deploy(1)

        // create the next instance from the current
        const nextInstance = instance.next()

        // apply updates on the next instance off chain
        nextInstance.set(Status.Accepted)

        // call the method of current instance to apply the updates on chain
        const callContract = async () =>
            instance.methods.unlock({
                next: {
                    instance: nextInstance,
                    balance,
                },
            } as MethodCallOptions<Enum>)
        await expect(callContract()).not.rejected
    })
})
