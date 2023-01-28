import { AnyoneCanSpend } from '../../src/contracts/acs'
import { inputIndex, inputSatoshis, outputIndex } from './util/txHelper'
import {
    bsv,
    Ripemd160,
    TestWallet,
    toHex,
    WhatsonchainProvider,
} from 'scrypt-ts'
import { myPrivateKey, myPublicKeyHash } from './util/myPrivateKey'

async function main() {
    await AnyoneCanSpend.compile()
    const acs = new AnyoneCanSpend(Ripemd160(toHex(myPublicKeyHash)))

    const signer = new TestWallet(myPrivateKey).connect(
        new WhatsonchainProvider(bsv.Networks.testnet)
    )

    // connect to a signer
    acs.connect(signer)

    // contract deployment
    const deployTx = await acs.deploy(inputSatoshis)
    console.log('AnyoneCanSpend contract deployed: ', deployTx.id)

    // contract call
    const changeAddress = await signer.getDefaultAddress()
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
    const callTx = await signer.signAndsendTransaction(unsignedCallTx)
    console.log('AnyoneCanSpend contract called: ', callTx.id)
}

describe('Test SmartContract `AnyoneCanSpend` on testnet', () => {
    it('should success', async () => {
        await main()
    })
})
