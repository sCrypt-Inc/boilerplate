import { AccumulatorMultiSig } from '../../src/contracts/accumulatorMultiSig'
import { getUtxoManager } from './util/utxoManager'
import { signAndSend } from './util/txHelper'
import { bsv, Ripemd160, toHex } from 'scrypt-ts'

async function main() {
    const utxoMgr = await getUtxoManager()
    await AccumulatorMultiSig.compile()

    const privateKey1 = bsv.PrivateKey.fromRandom('testnet')
    const publicKey1 = bsv.PublicKey.fromPrivateKey(privateKey1)
    const publicKeyHash1 = bsv.crypto.Hash.sha256ripemd160(
        publicKey1.toBuffer()
    )

    const privateKey2 = bsv.PrivateKey.fromRandom('testnet')
    const publicKey2 = bsv.PublicKey.fromPrivateKey(privateKey2)
    const publicKeyHash2 = bsv.crypto.Hash.sha256ripemd160(
        publicKey2.toBuffer()
    )

    const privateKey3 = bsv.PrivateKey.fromRandom('testnet')
    const publicKey3 = bsv.PublicKey.fromPrivateKey(privateKey3)
    const publicKeyHash3 = bsv.crypto.Hash.sha256ripemd160(
        publicKey3.toBuffer()
    )

    const accumulatorMultiSig = new AccumulatorMultiSig(2n, [
        Ripemd160(toHex(publicKeyHash1)),
        Ripemd160(toHex(publicKeyHash2)),
        Ripemd160(toHex(publicKeyHash3)),
    ])

    // contract deployment
    // 1. get the available utxos for the private key
    const utxos = await utxoMgr.getUtxos()
    // 2. construct a transaction for deployment
    const unsignedDeployTx = accumulatorMultiSig.getDeployTx(utxos, 1000)
    // 3. sign and broadcast the transaction
    const deployTx = await signAndSend(unsignedDeployTx)
    console.log('AccumulatorMultiSig contract deployed: ', deployTx.id)

    // collect the new p2pkh utxo
    utxoMgr.collectUtxoFrom(deployTx)

    // contract call
    // 1. construct a transaction for call
    const unsignedCallTx = accumulatorMultiSig.getCallTx(
        [publicKey1, publicKey2, publicKey3],
        [privateKey1, privateKey2, privateKey3],
        deployTx
    )
    // 2. sign and broadcast the transaction
    const callTx = await signAndSend(unsignedCallTx)
    console.log('AccumulatorMultiSig contract called: ', callTx.id)

    // collect the new p2pkh utxo if it exists in `callTx`
    utxoMgr.collectUtxoFrom(callTx)
}

describe('Test SmartContract `AccumulatorMultiSig` on testnet', () => {
    it('should success', async () => {
        await main()
    })
})
