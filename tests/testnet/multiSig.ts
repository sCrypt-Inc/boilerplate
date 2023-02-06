import { MultiSig } from '../../src/contracts/multiSig'
import {
    getTestnetSigner,
    inputIndex,
    inputSatoshis,
    outputIndex,
    randomPrivateKey,
} from './util/txHelper'
import { myPrivateKey } from './util/privateKey'
import {
    bsv,
    PubKey,
    PubKeyHash,
    Ripemd160,
    Sig,
    toHex,
    utxoFromOutput,
} from 'scrypt-ts'

async function main() {
    const [privateKey1, , publicKeyHash1, address1] = randomPrivateKey()
    const [privateKey2, , publicKeyHash2, address2] = randomPrivateKey()
    const [privateKey3, , publicKeyHash3, address3] = randomPrivateKey()

    await MultiSig.compile()
    const multiSig = new MultiSig([
        PubKeyHash(toHex(publicKeyHash1)),
        PubKeyHash(toHex(publicKeyHash2)),
        PubKeyHash(toHex(publicKeyHash3)),
    ])

    const signer = await getTestnetSigner([
        myPrivateKey,
        privateKey1,
        privateKey2,
        privateKey3,
    ])

    // connect to a signer
    await multiSig.connect(signer)

    // deploy
    const deployTx = await multiSig.deploy(inputSatoshis)
    console.log('MultiSig contract deployed: ', deployTx.id)

    // call
    const changeAddress = await signer.getDefaultAddress()
    const unsignedCallTx: bsv.Transaction = await new bsv.Transaction()
        .addInputFromPrevTx(deployTx)
        .change(changeAddress)
        .setInputScriptAsync({ inputIndex }, (tx: bsv.Transaction) => {
            // bind contract & tx unlocking relation
            multiSig.unlockFrom = { tx, inputIndex }
            // use the cloned version because this callback may be executed multiple times during tx building process,
            // and calling contract method may have side effects on its properties.
            return multiSig.getUnlockingScript(async (cloned) => {
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

                cloned.unlock(
                    [Sig(sigs[0]), Sig(sigs[1]), Sig(sigs[2])],
                    [PubKey(pubKeys[0]), PubKey(pubKeys[1]), PubKey(pubKeys[2])]
                )
            })
        })
    const callTx = await signer.signAndsendTransaction(unsignedCallTx)
    console.log('MultiSig contract called: ', callTx.id)
}

describe('Test SmartContract `MultiSig` on testnet', () => {
    it('should succeed', async () => {
        await main()
    })
})
