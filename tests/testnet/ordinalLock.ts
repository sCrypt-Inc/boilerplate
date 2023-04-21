import { OrdinalLock } from '../../src/contracts/ordinalLock'
import {
    bsv,
    Utils,
    PubKeyHash,
    hash160,
    MethodCallOptions,
    findSig,
    PubKey,
} from 'scrypt-ts'
import { myPublicKey } from '../utils/privateKey'
import {
    bindInscription,
    purchaseTxBuilder,
    reconstructContractInstance,
} from '../../src/contracts/ordinalLock'
import { getDefaultSigner, inputSatoshis } from '../utils/helper'

// Listing price.
const price = 10000n

// Output that will pay the seller.
const payOutput = Utils.buildPublicKeyHashOutput(
    hash160(myPublicKey.toHex()),
    price
)

async function deploy() {
    await OrdinalLock.compile()
    const instance = new OrdinalLock(
        PubKeyHash(hash160(myPublicKey.toHex())),
        payOutput
    )

    // Connect to a signer
    await instance.connect(getDefaultSigner())

    // Bind inscription to ordinal-lock contract
    const inscriptionScript = bsv.Script.fromASM(
        'OP_FALSE OP_IF 6f7264 OP_TRUE 746578742f706c61696e OP_FALSE 546573742046696c6520310a OP_ENDIF'
    )
    bindInscription(instance, inscriptionScript)

    // Contract deployment
    const tx = await instance.deploy(inputSatoshis)
    console.log('OrdinalLock contract deployed: ', tx.id)

    return tx.id
}

async function callPurchase(deployTXID: string) {
    // Fetch tx using a provider.
    const signer = getDefaultSigner()
    const instance = await reconstructContractInstance(
        deployTXID,
        signer.connectedProvider
    )

    await instance.connect(signer)

    // Bind tx builder for public method "purchase"
    instance.bindTxBuilder('purchase', purchaseTxBuilder)

    // Construct dest output w inscription
    const destInscription = bsv.Script.fromASM(
        'OP_FALSE OP_IF 6f7264 OP_TRUE 746578742f706c61696e OP_FALSE 48656c6c6f2c2073437279707421 OP_ENDIF'
    )
    const destOutput = new bsv.Transaction.Output({
        script: destInscription,
        satoshis: 1,
    })
    const destOutputStr = destOutput.toBufferWriter().toBuffer().toString('hex')

    // Call public method "purchase"
    const { tx } = await instance.methods.purchase(destOutputStr, {
        changeAddress: await signer.getDefaultAddress(),
    } as MethodCallOptions<OrdinalLock>)
    console.log('"purchase" method called: ', tx.id)

    return tx.id
}

async function callCancel(deployTXID: string) {
    // Fetch tx using a provider.
    const signer = getDefaultSigner()
    const instance = await reconstructContractInstance(
        deployTXID,
        signer.connectedProvider
    )

    await instance.connect(signer)

    const { tx } = await instance.methods.cancel(
        (sigResp) => findSig(sigResp, myPublicKey),
        PubKey(myPublicKey.toHex()),
        {
            pubKeyOrAddrToSign: myPublicKey,
        } as MethodCallOptions<OrdinalLock>
    )
    console.log('"purchase" method called: ', tx.id)

    return tx.id
}

describe('Test SmartContract `OrdinalLock` on testnet', () => {
    it('deploy + call "purchase"', async () => {
        const deployTXID = await deploy()
        await callPurchase(deployTXID)
    })

    it('deploy + call "cancel"', async () => {
        const deployTXID = await deploy()
        await callCancel(deployTXID)
    })
})
