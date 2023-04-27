import { Clone } from '../../src/contracts/clone'
import { getDefaultSigner, sleep } from '../utils/helper'
import { MethodCallOptions } from 'scrypt-ts'

async function main() {
    await Clone.compile()

    const clone = new Clone()

    // connect to a signer
    await clone.connect(getDefaultSigner())

    const balance = 1

    // contract deployment
    const deployTx = await clone.deploy(balance)
    console.log('Counter deploy tx:', deployTx.id)

    // set current instance to be the deployed one
    let currentInstance = clone

    // call the method of current instance to apply the updates on chain
    for (let i = 0; i < 3; ++i) {
        // avoid mempool conflicts, sleep to allow previous tx "sink-into" the network
        await sleep(2)

        // create the next instance from the current
        const nextInstance = currentInstance.next()

        // call the method of current instance to apply the updates on chain
        const { tx: tx_i } = await currentInstance.methods.unlock({
            next: {
                instance: nextInstance,
                balance,
            },
        } as MethodCallOptions<Clone>)

        console.log(`Clone call tx: ${tx_i.id}`)

        // update the current instance reference
        currentInstance = nextInstance
    }
}

describe('Test SmartContract `Clone` on testnet', () => {
    it('should succeed', async () => {
        await main()
    })
})
