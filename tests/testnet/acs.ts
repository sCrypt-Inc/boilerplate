import { AnyoneCanSpend } from '../../src/contracts/acs'
import {
    inputIndex,
    inputSatoshis,
    outputIndex,
    testnetDefaultSigner,
} from './util/txHelper'
import { bsv, Ripemd160, toHex } from 'scrypt-ts'
import { myPublicKeyHash } from './util/privateKey'

async function main() {
    await AnyoneCanSpend.compile()
    const acs = new AnyoneCanSpend(Ripemd160(toHex(myPublicKeyHash)))

    // connect to a signer
    await acs.connect(await testnetDefaultSigner)

    // contract deployment
    const deployTx = await acs.deploy(inputSatoshis)
    console.log('AnyoneCanSpend contract deployed: ', deployTx.id)

    // contract call
    const changeAddress = await (await testnetDefaultSigner).getDefaultAddress()
    const unsignedCallTx: bsv.Transaction = await new bsv.Transaction()
        .addInputFromPrevTx(deployTx)
        .change(changeAddress)
        .setInputScriptAsync(
            {
                inputIndex,
                sigtype: bsv.crypto.Signature.ANYONECANPAY_SINGLE,
            },
            (tx: bsv.Transaction) => {
                // bind contract & tx unlocking relation
                acs.unlockFrom = { tx, inputIndex }
                // use the cloned version because this callback may be executed multiple times during tx building process,
                // and calling contract method may have side effects on its properties.
                return acs.getUnlockingScript(async (cloned) => {
                    cloned.unlock(BigInt(tx.getOutputAmount(outputIndex)))
                })
            }
        )
    const callTx = await (
        await testnetDefaultSigner
    ).signAndsendTransaction(unsignedCallTx)
    console.log('AnyoneCanSpend contract called: ', callTx.id)
}

describe('Test SmartContract `AnyoneCanSpend` on testnet', () => {
    it('should success', async () => {
        await main()
    })
})
