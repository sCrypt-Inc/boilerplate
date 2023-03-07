import { Demo } from '../../src/contracts/demo'
import { getDefaultSigner, inputSatoshis } from '../utils/helper'

async function main() {
    await Demo.compile()
    const demo = new Demo(1n, 2n)

    // connect to a signer
    await demo.connect(getDefaultSigner())

    // contract deployment
    const deployTx = await demo.deploy(inputSatoshis)
    console.log('Demo contract deployed: ', deployTx.id)

    // contract call
    const { tx: callTx } = await demo.methods.add(3n)
    console.log('Demo contract `add` called: ', callTx.id)
}

describe('Test SmartContract `Demo` on testnet', () => {
    it('should succeed', async () => {
        await main()
    })
})
