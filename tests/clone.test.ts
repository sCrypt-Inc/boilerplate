import { expect } from 'chai'
import { Clone } from '../src/contracts/clone'
import { getDefaultSigner } from './utils/helper'
import { MethodCallOptions } from 'scrypt-ts'

describe('Test SmartContract `Clone`', () => {
    before(async () => {
        await Clone.compile()
    })

    it('should pass the public method unit test successfully.', async () => {
        const balance = 1

        const clone = new Clone()
        await clone.connect(getDefaultSigner())

        const deployTx = await clone.deploy(1)
        console.log('Clone contract deployed: ', deployTx.id)

        // set current instance to be the deployed one
        let currentInstance = clone

        // call the method of current instance to apply the updates on chain
        for (let i = 0; i < 3; ++i) {
            // create the next instance from the current
            const nextInstance = currentInstance.next()

            // call the method of current instance to apply the updates on chain
            const { tx: tx_i, atInputIndex } =
                await currentInstance.methods.unlock({
                    next: {
                        instance: nextInstance,
                        balance,
                    },
                } as MethodCallOptions<Clone>)

            const result = tx_i.verifyScript(atInputIndex)
            expect(result.success, result.error).to.eq(true)
            console.log('Clone contract called: ', tx_i.id)
            // update the current instance reference
            currentInstance = nextInstance
        }
    })
})
