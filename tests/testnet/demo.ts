import { Demo } from '../../src/contracts/demo'
import { getTestnetSigner, inputSatoshis } from './util/txHelper'

async function main() {
    await Demo.compile()
    const demo = new Demo(1n, 2n)

    // connect to a signer
    await demo.connect(getTestnetSigner())

    // contract deployment
    const deployTx = await demo.deploy(inputSatoshis)
    console.log('Demo contract deployed: ', deployTx.id)

    // contract call
    const { tx: callTx } = await demo.methods.add(3n)
    console.log('Demo contract `add` called: ', callTx.id)
}

main().catch((e) => {
    console.log('error', e.message)
})
