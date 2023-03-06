import { P2PKH } from '../../src/contracts/p2pkh'
import { getDefaultSigner, inputSatoshis } from './util/txHelper'
import { myPublicKey, myPublicKeyHash } from '../util/privateKey'

import {
    findSig,
    MethodCallOptions,
    PubKey,
    PubKeyHash,
    toHex,
    bsv,
} from 'scrypt-ts'

import Transaction = bsv.Transaction

let deployTx: Transaction
const atOutputIndex = 0

async function deploy() {
    await P2PKH.compile()
    const p2pkh = new P2PKH(PubKeyHash(toHex(myPublicKeyHash)))
    await p2pkh.connect(getDefaultSigner())

    deployTx = await p2pkh.deploy(inputSatoshis)
    console.log('P2PKH contract deployed: ', deployTx.id)
}

async function call() {
    // recover instance from tx
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
