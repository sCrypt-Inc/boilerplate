import { HelloWorld } from '../../src/contracts/helloWorld'
import {
    inputIndex,
    inputSatoshis,
    testnetDefaultSigner,
} from './util/txHelper'
import { bsv, toByteString } from 'scrypt-ts'

async function main() {
    await HelloWorld.compile()
    const helloworld = new HelloWorld()

    // connect to a signer
    await helloworld.connect(await testnetDefaultSigner)

    // contract deployment
    const deployTx = await helloworld.deploy(inputSatoshis)
    console.log('HelloWorld contract deployed: ', deployTx.id)

    // contract call
    const changeAddress = await (await testnetDefaultSigner).getDefaultAddress()
    const unsignedCallTx: bsv.Transaction = await new bsv.Transaction()
        .addInputFromPrevTx(deployTx)
        .change(changeAddress)
        .setInputScriptAsync({ inputIndex }, (tx: bsv.Transaction) => {
            // bind contract & tx unlocking relation
            helloworld.unlockFrom = { tx, inputIndex }
            // use the cloned version because this callback may be executed multiple times during tx building process,
            // and calling contract method may have side effects on its properties.
            return helloworld.getUnlockingScript(async (cloned) => {
                cloned.unlock(toByteString('hello world', true))
            })
        })
    const callTx = await (
        await testnetDefaultSigner
    ).signAndsendTransaction(unsignedCallTx)
    console.log('HelloWorld contract `unlock` called: ', callTx.id)
}

describe('Test SmartContract `HelloWorld` on testnet', () => {
    it('should succeed', async () => {
        await main()
    })
})
