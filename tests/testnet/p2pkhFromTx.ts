import { P2PKH } from '../../src/contracts/p2pkh'
import { getDefaultSigner, inputSatoshis } from '../utils/helper'
import { myPublicKey, myPublicKeyHash } from '../utils/privateKey'

import {
    bsv,
    DefaultProvider,
    findSig,
    MethodCallOptions,
    PubKey,
    PubKeyHash,
    toHex,
} from 'scrypt-ts'
import Transaction = bsv.Transaction

let deployTXID: string
const atOutputIndex = 0

async function deploy() {
    await P2PKH.compile()
    const p2pkh = new P2PKH(PubKeyHash(toHex(myPublicKeyHash)))
    await p2pkh.connect(getDefaultSigner())

    const deployTx = await p2pkh.deploy(inputSatoshis)
    deployTXID = deployTx.id
    console.log('P2PKH contract deployed: ', deployTXID)
}

async function call() {
    // Fetch tx using a provider and reconstruct contract instance.
    const provider = new DefaultProvider()
    const deployTx = await provider.getTransaction(deployTXID)
    const p2pkh = P2PKH.fromTx(deployTx, atOutputIndex)

    await p2pkh.connect(getDefaultSigner())

    const { tx } = await p2pkh.methods.unlock(
        (sigResps) => findSig(sigResps, myPublicKey),
        PubKey(toHex(myPublicKey)),
        {
            pubKeyOrAddrToSign: myPublicKey,
        } as MethodCallOptions<P2PKH>
    )
    console.log('P2PKH contract called: ', tx.id)
}

describe('Test SmartContract `P2PKH` on testnet using `SmartContract.fromTx`', () => {
    it('should succeed', async () => {
        await deploy()
        await call()
    })
})
