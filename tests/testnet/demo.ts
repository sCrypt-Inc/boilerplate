import { Demo } from '../../src/contracts/demo'
import {
    inputIndex,
    inputSatoshis,
    testnetDefaultSigner,
} from './util/txHelper'
import { bsv } from 'scrypt-ts'

async function main() {
    await Demo.compile()
    const demo = new Demo(1n, 2n)

    // connect to a signer
    await demo.connect(await testnetDefaultSigner)

    // contract deployment
    const deployTx = await demo.deploy(inputSatoshis)
    console.log('Demo contract deployed: ', deployTx.id)

    // contract call
    const changeAddress = await (await testnetDefaultSigner).getDefaultAddress()
    const unsignedCallTx: bsv.Transaction = await new bsv.Transaction()
        .addInputFromPrevTx(deployTx)
        .change(changeAddress)
        .setInputScriptAsync({ inputIndex }, (tx: bsv.Transaction) => {
            // bind contract & tx unlocking relation
            demo.to = { tx, inputIndex }
            // use the cloned version because this callback may be executed multiple times during tx building process,
            // and calling contract method may have side effects on its properties.
            return demo.getUnlockingScript(async (cloned) => {
                cloned.add(3n)
            })
        })
    const callTx = await (
        await testnetDefaultSigner
    ).signAndsendTransaction(unsignedCallTx)
    console.log('Demo contract `add` called: ', callTx.id)
}

describe('Test SmartContract `Demo` on testnet', () => {
    it('should succeed', async () => {
        await main()
    })
})
