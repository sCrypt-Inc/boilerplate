import { AdvancedCounter } from '../../src/contracts/advancedCounter'
import { getDefaultSigner, sleep } from '../utils/helper'
import { MethodCallOptions } from 'scrypt-ts'

async function main() {
    await AdvancedCounter.compile()

    const counter = new AdvancedCounter(0n)

    // connect to a signer
    await counter.connect(getDefaultSigner())

    const balance = 1

    // contract deployment
    const deployTx = await counter.deploy(balance)
    console.log('AdvancedCounter deploy tx:', deployTx.id)

    // set current instance to be the deployed one
    let currentInstance = counter

    // call the method of current instance to apply the updates on chain
    for (let i = 0; i < 3; ++i) {
        // create the next instance from the current
        const nextInstance = currentInstance.next()

        // apply updates on the next instance off chain
        nextInstance.increment()

        // call the method of current instance to apply the updates on chain
        const { tx: tx_i } = await currentInstance.methods.incrementOnChain({
            next: {
                instance: nextInstance,
                balance,
            },
        } as MethodCallOptions<AdvancedCounter>)

        console.log(
            `AdvancedCounter call tx: ${tx_i.id}, count updated to: ${nextInstance.count}`
        )

        // update the current instance reference
        currentInstance = nextInstance
    }
}

describe('Test SmartContract `AdvancedCounter` on testnet', () => {
    it('should succeed', async () => {
        await main()
    })
})
