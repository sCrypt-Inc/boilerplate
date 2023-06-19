import { expect } from 'chai'
import { AdvancedCounter } from '../../src/contracts/advancedCounter'
import { getDummySigner, getDummyUTXO } from '../utils/helper'
import { MethodCallOptions } from 'scrypt-ts'

describe('Test SmartContract `AdvancedCounter`', () => {
    before(async () => {
        await AdvancedCounter.compile()
    })

    it('should pass the public method unit test successfully.', async () => {
        const balance = 1

        const counter = new AdvancedCounter(0n)
        await counter.connect(getDummySigner())

        // set current instance to be the deployed one
        let currentInstance = counter

        // call the method of current instance to apply the updates on chain
        for (let i = 0; i < 3; ++i) {
            // create the next instance from the current
            const nextInstance = currentInstance.next()

            // apply updates on the next instance off chain
            nextInstance.increment()

            // call the method of current instance to apply the updates on chain
            const { tx: tx_i, atInputIndex } =
                await currentInstance.methods.incrementOnChain({
                    fromUTXO: getDummyUTXO(balance),
                    next: {
                        instance: nextInstance,
                        balance,
                    },
                } as MethodCallOptions<AdvancedCounter>)

            const result = tx_i.verifyScript(atInputIndex)
            expect(result.success, result.error).to.eq(true)

            // update the current instance reference
            currentInstance = nextInstance
        }
    })
})
