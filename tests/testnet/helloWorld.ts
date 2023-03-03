import { HelloWorld } from '../../src/contracts/helloWorld'
import { getDefaultSigner, inputSatoshis } from './util/txHelper'
import { toByteString, sha256 } from 'scrypt-ts'

const message = 'hello world, sCrypt!'

async function main() {
    await HelloWorld.compile()
    const helloWorld = new HelloWorld(sha256(toByteString(message, true)))

    // connect to a signer
    await helloWorld.connect(getDefaultSigner())

    // contract deployment
    const deployTx = await helloWorld.deploy(inputSatoshis)
    console.log('HelloWorld contract deployed: ', deployTx.id)

    // contract call
    const { tx: callTx } = await helloWorld.methods.unlock(
        toByteString(message, true)
    )
    console.log('HelloWorld contract `unlock` called: ', callTx.id)
}

describe('Test SmartContract `HelloWorld` on testnet', () => {
    it('should succeed', async () => {
        await main()
    })
})
