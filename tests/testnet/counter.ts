import { Counter } from '../../src/contracts/counter'
import { getDefaultSigner, sleep } from '../utils/helper'
import { MethodCallOptions } from 'scrypt-ts'

async function main() {
    await Counter.compile()

    const counter = new Counter(0n)

    // connect to a signer
    await counter.connect(getDefaultSigner())

    const balance = 1

    // contract deployment
    const deployTx = await counter.deploy(balance)
    console.log('Counter deploy tx:', deployTx.id)

    // set current instance to be the deployed one
    let currentInstance = counter

    // call the method of current instance to apply the updates on chain
    for (let i = 0; i < 3; ++i) {
        // avoid mempool conflicts, sleep to allow previous tx "sink-into" the network
        await sleep(2)

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
        } as MethodCallOptions<Counter>)

        console.log(
            `Counter call tx: ${tx_i.id}, count updated to: ${nextInstance.count}`
        )

        // update the current instance reference
        currentInstance = nextInstance
    }
}

describe('Test SmartContract `Counter` on testnet', () => {
    it('should succeed', async () => {
        await main()
    })
})
