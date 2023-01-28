import { P2PKH } from '../../src/contracts/p2pkh'
import {
    inputIndex,
    inputSatoshis,
    outputIndex,
    testnetDefaultSigner,
} from './util/txHelper'
import { myAddress, myPublicKeyHash } from './util/privateKey'

import { bsv, PubKey, Ripemd160, Sig, toHex, utxoFromOutput } from 'scrypt-ts'

async function main() {
    await P2PKH.compile()
    const p2pkh = new P2PKH(Ripemd160(toHex(myPublicKeyHash)))

    // connect to a signer
    p2pkh.connect(testnetDefaultSigner)

    // deploy
    const deployTx = await p2pkh.deploy(inputSatoshis)
    console.log('P2PKH contract deployed: ', deployTx.id)

    // call
    const changeAddress = await testnetDefaultSigner.getDefaultAddress()
    const unsignedCallTx: bsv.Transaction = await new bsv.Transaction()
        .addInputFromPrevTx(deployTx)
        .change(changeAddress)
        .setInputScriptAsync({ inputIndex }, (tx: bsv.Transaction) => {
            // bind contract & tx unlocking relation
            p2pkh.unlockFrom = { tx, inputIndex }
            // use the cloned version because this callback may be executed multiple times during tx building process,
            // and calling contract method may have side effects on its properties.
            return p2pkh.getUnlockingScript(async (cloned) => {
                const spendingUtxo = utxoFromOutput(deployTx, outputIndex)

                const sigResponses = await testnetDefaultSigner.getSignatures(
                    tx.toString(),
                    [
                        {
                            inputIndex,
                            satoshis: spendingUtxo.satoshis,
                            scriptHex: spendingUtxo.script,
                            address: myAddress,
                        },
                    ]
                )

                const sigs = sigResponses.map((sigResp) => sigResp.sig)
                const pubKeys = sigResponses.map((sigResp) => sigResp.publicKey)

                cloned.unlock(Sig(sigs[0]), PubKey(pubKeys[0]))
            })
        })
    const callTx = await testnetDefaultSigner.signAndsendTransaction(
        unsignedCallTx
    )
    console.log('P2PKH contract called: ', callTx.id)
}

describe('Test SmartContract `P2PKH` on testnet', () => {
    it('should success', async () => {
        await main()
    })
})
