import { HelloWorld } from '../../src/contracts/helloworld'
import {
    inputIndex,
    inputSatoshis,
    testnetDefaultSigner,
} from './util/txHelper'
import { bsv, utf8ToByteString } from 'scrypt-ts'

async function main() {
    await HelloWorld.compile()
    const helloworld = new HelloWorld()

    // connect to a signer
    helloworld.connect(testnetDefaultSigner)

    // contract deployment
    const deployTx = await helloworld.deploy(inputSatoshis)
    console.log('HelloWorld contract deployed: ', deployTx.id)

    // contract call
    const changeAddress = await testnetDefaultSigner.getDefaultAddress()
    const unsignedCallTx: bsv.Transaction = await new bsv.Transaction()
        .addInputFromPrevTx(deployTx)
        .change(changeAddress)
        .setInputScriptAsync({ inputIndex }, (tx: bsv.Transaction) => {
            // bind contract & tx unlocking relation
            helloworld.unlockFrom = { tx, inputIndex }
            // use the cloned version because this callback may be executed multiple times during tx building process,
            // and calling contract method may have side effects on its properties.
            return helloworld.getUnlockingScript(async (cloned) => {
                const message = 'hello world'
                cloned.unlock(utf8ToByteString(message))
            })
        })
    const callTx = await testnetDefaultSigner.signAndsendTransaction(
        unsignedCallTx
    )
    console.log('HelloWorld contract `unlock` called: ', callTx.id)
}

describe('Test SmartContract `HelloWorld` on testnet', () => {
    it('should success', async () => {
        await main()
    })
})
