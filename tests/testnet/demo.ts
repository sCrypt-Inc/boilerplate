import { Demo } from '../../src/contracts/demo'
import { inputIndex, inputSatoshis } from './util/txHelper'
import { bsv, TestWallet, WhatsonchainProvider } from 'scrypt-ts'
import { myPrivateKey } from './util/myPrivateKey'

async function main() {
    await Demo.compile()
    const demo = new Demo(1n, 2n)

    const signer = new TestWallet(myPrivateKey).connect(
        new WhatsonchainProvider(bsv.Networks.testnet)
    )

    // connect to a signer
    demo.connect(signer)

    // contract deployment
    const deployTx = await demo.deploy(inputSatoshis)
    console.log('Demo contract deployed: ', deployTx.id)

    // contract call
    const changeAddress = await signer.getDefaultAddress()
    const unsignedCallTx: bsv.Transaction = await new bsv.Transaction()
        .addInputFromPrevTx(deployTx)
        .change(changeAddress)
        .setInputScriptAsync({ inputIndex }, (tx: bsv.Transaction) => {
            // bind contract & tx unlocking relation
            demo.unlockFrom = { tx, inputIndex }
            // use the cloned version because this callback may be executed multiple times during tx building process,
            // and calling contract method may have side effects on its properties.
            return demo.getUnlockingScript(async (cloned) => {
                cloned.add(3n)
            })
        })
    const callTx = await signer.signAndsendTransaction(unsignedCallTx)
    console.log('Demo contract `add` called: ', callTx.id)
}

describe('Test SmartContract `Demo` on testnet', () => {
    it('should success', async () => {
        await main()
    })
})
