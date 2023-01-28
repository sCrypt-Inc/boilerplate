import { inputIndex, inputSatoshis } from './util/txHelper'
import { Ackermann } from '../../src/contracts/ackermann'
import { bsv, TestWallet, WhatsonchainProvider } from 'scrypt-ts'
import { myPrivateKey } from './util/myPrivateKey'

async function main() {
    await Ackermann.compile()
    const ackermann = new Ackermann(2n, 1n)

    const signer = new TestWallet(myPrivateKey).connect(
        new WhatsonchainProvider(bsv.Networks.testnet)
    )

    // connect to a signer
    ackermann.connect(signer)

    // contract deploy
    const deployTx = await ackermann.deploy(inputSatoshis)
    console.log('Ackermann contract deployed: ', deployTx.id)

    // contract call
    const changeAddress = await signer.getDefaultAddress()
    const unsignedCallTx: bsv.Transaction = await new bsv.Transaction()
        .addInputFromPrevTx(deployTx)
        .change(changeAddress)
        .setInputScriptAsync({ inputIndex }, (tx: bsv.Transaction) => {
            // bind contract & tx unlocking relation
            ackermann.unlockFrom = { tx, inputIndex }
            // use the cloned version because this callback may be executed multiple times during tx building process,
            // and calling contract method may have side effects on its properties.
            return ackermann.getUnlockingScript(async (cloned) => {
                cloned.unlock(5n)
            })
        })
    const callTx = await signer.signAndsendTransaction(unsignedCallTx)
    console.log('Ackermann contract called: ', callTx.id)
}

describe('Test SmartContract `Ackermann` on testnet', () => {
    it('should success', async () => {
        await main()
    })
})
