import { expect } from 'chai'
import { Counter2 } from '../src/contracts/counter2'
import { getDefaultSigner } from './utils/helper'
import { MethodCallOptions } from 'scrypt-ts'

describe('Test SmartContract `Counter`', () => {
    before(() => {
        Counter2.loadArtifact()
    })

    it('should pass the public method increment test successfully.', async () => {
        const balance = 1

        const counter = new Counter2(0n)
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
                currentInstance.methods.incrementOnChain({
                    next: {
                        instance: nextInstance,
                        balance,
                    },
                } as MethodCallOptions<Counter2>)

            await expect(callContract()).not.rejected

            // update the current instance reference
            currentInstance = nextInstance
        }
    })

    it('should pass the public method reset test successfully.', async () => {
        const balance = 1

        const counter = new Counter2(2n)
        await counter.connect(getDefaultSigner())

        await counter.deploy(1)

        // set current instance to be the deployed one
        let currentInstance = counter

        // call the method of current instance to apply the updates on chain
        for (let i = 0; i < 3; ++i) {
            // create the next instance from the current
            const nextInstance = currentInstance.next()

            // apply updates on the next instance off chain
            nextInstance.reset()

            // call the method of current instance to apply the updates on chain
            const callContract = async () =>
                currentInstance.methods.resetOnChain({
                    next: {
                        instance: nextInstance,
                        balance,
                    },
                } as MethodCallOptions<Counter2>)
            await expect(callContract()).not.rejected

            // update the current instance reference
            currentInstance = nextInstance
        }
    })

    it('should pass the public method decreament test successfully.', async () => {
        const balance = 1

        const counter = new Counter2(2n)
        await counter.connect(getDefaultSigner())

        await counter.deploy(1)

        // set current instance to be the deployed one
        let currentInstance = counter

        // call the method of current instance to apply the updates on chain
        for (let i = 0; i < 3; ++i) {
            // create the next instance from the current
            const nextInstance = currentInstance.next()

            // apply updates on the next instance off chain
            nextInstance.decreament()

            // call the method of current instance to apply the updates on chain
            const callContract = async () =>
                currentInstance.methods.decreamentOnChain({
                    next: {
                        instance: nextInstance,
                        balance,
                    },
                } as MethodCallOptions<Counter2>)

            await expect(callContract()).not.rejected

            // update the current instance reference
            currentInstance = nextInstance
        }
    })
})
