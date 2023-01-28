import { AccumulatorMultiSig } from '../../src/contracts/accumulatorMultiSig'
import {
    getTestnetSigner,
    inputIndex,
    inputSatoshis,
    outputIndex,
    randomPrivateKey,
} from './util/txHelper'
import { myPrivateKey } from './util/privateKey'
import { bsv, PubKey, Ripemd160, Sig, toHex, utxoFromOutput } from 'scrypt-ts'

async function main() {
    const [privateKey1, , publicKeyHash1, address1] = randomPrivateKey()
    const [privateKey2, , publicKeyHash2, address2] = randomPrivateKey()
    const [privateKey3, , publicKeyHash3, address3] = randomPrivateKey()

    await AccumulatorMultiSig.compile()
    const accumulatorMultiSig = new AccumulatorMultiSig(2n, [
        Ripemd160(toHex(publicKeyHash1)),
        Ripemd160(toHex(publicKeyHash2)),
        Ripemd160(toHex(publicKeyHash3)),
    ])

    const signer = getTestnetSigner([
        myPrivateKey,
        privateKey1,
        privateKey2,
        privateKey3,
    ])

    // connect to a signer
    accumulatorMultiSig.connect(signer)

    // deploy
    const deployTx = await accumulatorMultiSig.deploy(inputSatoshis)
    console.log('AccumulatorMultiSig contract deployed: ', deployTx.id)

    // call
    const changeAddress = await signer.getDefaultAddress()
    const unsignedCallTx: bsv.Transaction = await new bsv.Transaction()
        .addInputFromPrevTx(deployTx)
        .change(changeAddress)
        .setInputScriptAsync({ inputIndex }, (tx: bsv.Transaction) => {
            // bind contract & tx unlocking relation
            accumulatorMultiSig.unlockFrom = { tx, inputIndex }
            // use the cloned version because this callback may be executed multiple times during tx building process,
            // and calling contract method may have side effects on its properties.
            return accumulatorMultiSig.getUnlockingScript(async (cloned) => {
                const spendingUtxo = utxoFromOutput(deployTx, outputIndex)

                const sigResponses = await signer.getSignatures(tx.toString(), [
                    {
                        inputIndex,
                        satoshis: spendingUtxo.satoshis,
                        scriptHex: spendingUtxo.script,
                        address: [address1, address2, address3],
                    },
                ])

                const sigs = sigResponses.map((sigResp) => sigResp.sig)
                const pubKeys = sigResponses.map((sigResp) => sigResp.publicKey)

                cloned.main(
                    [
                        PubKey(pubKeys[0]),
                        PubKey(pubKeys[1]),
                        PubKey(pubKeys[2]),
                    ],
                    [Sig(sigs[0]), Sig(sigs[1]), Sig(sigs[2])],
                    [true, true, true]
                )
            })
        })
    const callTx = await signer.signAndsendTransaction(unsignedCallTx)
    console.log('AccumulatorMultiSig contract called: ', callTx.id)
}

describe('Test SmartContract `AccumulatorMultiSig` on testnet', () => {
    it('should success', async () => {
        await main()
    })
})
