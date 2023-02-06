import {
    inputIndex,
    inputSatoshis,
    testnetDefaultSigner,
} from './util/txHelper'
import { Ackermann } from '../../src/contracts/ackermann'
import { bsv } from 'scrypt-ts'

async function main() {
    await Ackermann.compile()
    const ackermann = new Ackermann(2n, 1n)

    // connect to a signer
    await ackermann.connect(await testnetDefaultSigner)

    // contract deploy
    const deployTx = await ackermann.deploy(inputSatoshis)
    console.log('Ackermann contract deployed: ', deployTx.id)

    // contract call
    const changeAddress = await (await testnetDefaultSigner).getDefaultAddress()
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
    const callTx = await (
        await testnetDefaultSigner
    ).signAndsendTransaction(unsignedCallTx)
    console.log('Ackermann contract called: ', callTx.id)
}

describe('Test SmartContract `Ackermann` on testnet', () => {
    it('should success', async () => {
        await main()
    })
})
