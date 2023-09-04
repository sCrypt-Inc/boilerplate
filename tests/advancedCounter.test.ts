import { expect } from 'chai'
import { AdvancedCounter } from '../src/contracts/advancedCounter'
import { getDefaultSigner } from './utils/helper'
import { MethodCallOptions } from 'scrypt-ts'

describe('Test SmartContract `AdvancedCounter`', () => {
    before(() => {
        AdvancedCounter.loadArtifact()
    })

    it('should pass the public method unit test successfully.', async () => {
        const balance = 1

        const counter = new AdvancedCounter(0n)
        await counter.connect(getDefaultSigner())

        await counter.deploy(1)

        // set current instance to be the deployed one
        let currentInstance = counter

        // call the method of current instance to apply the updates on chain
        for (let i = 0; i < 3; ++i) {
            // create the next instance from the current
            const nextInstance = currentInstance.next()

            // apply updates on the next instance off chain
            nextInstance.increment()

            // call the method of current instance to apply the updates on chain
            const callContract = async () =>
                await currentInstance.methods.incrementOnChain({
                    next: {
                        instance: nextInstance,
                        balance,
                    },
                } as MethodCallOptions<AdvancedCounter>)

            expect(callContract()).to.be.not.throw

            // update the current instance reference
            currentInstance = nextInstance
        }
    })
})
