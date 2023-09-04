import { expect } from 'chai'
import { Clone } from '../src/contracts/clone'
import { getDefaultSigner } from './utils/helper'
import { MethodCallOptions } from 'scrypt-ts'

describe('Test SmartContract `Clone`', () => {
    before(() => {
        Clone.loadArtifact()
    })

    it('should pass the public method unit test successfully.', async () => {
        const balance = 1

        const clone = new Clone()
        await clone.connect(getDefaultSigner())

        await clone.deploy(1)

        // set current instance to be the deployed one
        let currentInstance = clone

        // call the method of current instance to apply the updates on chain
        for (let i = 0; i < 3; ++i) {
            // create the next instance from the current
            const nextInstance = currentInstance.next()

            // call the method of current instance to apply the updates on chain
            const callContract = async () =>
                currentInstance.methods.unlock({
                    next: {
                        instance: nextInstance,
                        balance,
                    },
                } as MethodCallOptions<Clone>)

            await expect(callContract()).not.rejected

            // update the current instance reference
            currentInstance = nextInstance
        }
    })
})
