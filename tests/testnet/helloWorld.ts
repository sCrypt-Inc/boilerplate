import { HelloWorld } from '../../src/contracts/helloWorld'
import { getTestnetSigner, inputSatoshis } from './util/txHelper'
import { toByteString } from 'scrypt-ts'

async function main() {
    await HelloWorld.compile()
    const helloWorld = new HelloWorld()

    // connect to a signer
    await helloWorld.connect(getTestnetSigner())

    // contract deployment
    const deployTx = await helloWorld.deploy(inputSatoshis)
    console.log('HelloWorld contract deployed: ', deployTx.id)

    // contract call
    const { tx: callTx } = await helloWorld.methods.unlock(
        toByteString('hello world', true)
    )
    console.log('HelloWorld contract `unlock` called: ', callTx.id)
}

main().catch((e) => {
    console.log('error', e.message)
})
