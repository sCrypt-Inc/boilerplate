import { P2PKH } from '../../src/contracts/p2pkh'
import { inputIndex } from './util/txHelper'
import { privateKey } from './util/privateKey'

import {
    bsv,
    PubKey,
    Ripemd160,
    Sig,
    TestWallet,
    toHex,
    utxoFromOutput,
    WhatsonchainProvider,
} from 'scrypt-ts'

async function main() {
    const publicKey = bsv.PublicKey.fromPrivateKey(privateKey)
    const publicKeyHash = bsv.crypto.Hash.sha256ripemd160(publicKey.toBuffer())
    const address = publicKey.toAddress()

    await P2PKH.compile()
    const p2pkh = new P2PKH(Ripemd160(toHex(publicKeyHash)))

    const signer = new TestWallet(privateKey).connect(
        new WhatsonchainProvider(bsv.Networks.testnet)
    )

    // connect to a signer
    p2pkh.connect(signer)

    // deploy
    const deployTx = await p2pkh.deploy(1000)
    console.log('P2PKH contract deployed: ', deployTx.id)

    // call
    const changeAddress = await signer.getDefaultAddress()
    const unsignedCallTx: bsv.Transaction = await new bsv.Transaction()
        .addInputFromPrevTx(deployTx)
        .change(changeAddress)
        .setInputScriptAsync({ inputIndex }, (tx: bsv.Transaction) => {
            // bind contract & tx unlocking relation
            p2pkh.unlockFrom = { tx, inputIndex }
            // use the cloned version because this callback may be executed multiple times during tx building process,
            // and calling contract method may have side effects on its properties.
            return p2pkh.getUnlockingScript(async (cloned) => {
                const spendingUtxo = utxoFromOutput(deployTx, 0)

                const sigResponses = await signer.getSignatures(tx.toString(), [
                    {
                        inputIndex,
                        satoshis: spendingUtxo.satoshis,
                        scriptHex: spendingUtxo.script,
                        address: address,
                    },
                ])

                const sigs = sigResponses.map((sigResp) => sigResp.sig)
                const pubKeys = sigResponses.map((sigResp) => sigResp.publicKey)

                cloned.unlock(Sig(sigs[0]), PubKey(pubKeys[0]))
            })
        })
    const callTx = await signer.signAndsendTransaction(unsignedCallTx)
    console.log('P2PKH contract called: ', callTx.id)
}

describe('Test SmartContract `P2PKH` on testnet', () => {
    it('should success', async () => {
        await main()
    })
})
