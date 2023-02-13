import { bsv, DummyProvider, TestWallet, UTXO } from 'scrypt-ts'
import { randomBytes } from 'crypto'
import { myPrivateKey } from '../../util/privateKey'

export const inputSatoshis = 10000

export const inputIndex = 0

export const dummyUTXO = {
    txId: randomBytes(32).toString('hex'),
    outputIndex: 0,
    script: '', // placeholder
    satoshis: inputSatoshis,
}

export function newTx(utxos?: Array<UTXO>) {
    if (utxos) {
        return new bsv.Transaction().from(utxos)
    }
    return new bsv.Transaction().from(dummyUTXO)
}

export function randomPrivateKey() {
    const privateKey = bsv.PrivateKey.fromRandom('testnet')
    const publicKey = bsv.PublicKey.fromPrivateKey(privateKey)
    const publicKeyHash = bsv.crypto.Hash.sha256ripemd160(publicKey.toBuffer())
    const address = publicKey.toAddress()
    return [privateKey, publicKey, publicKeyHash, address] as const
}

export function getDummySigner(
    privateKey?: bsv.PrivateKey | bsv.PrivateKey[]
): TestWallet {
    if (global.dummySigner === undefined) {
        global.dummySigner = new TestWallet(myPrivateKey, new DummyProvider())
    }
    if (privateKey !== undefined) {
        global.dummySigner.addPrivateKey(privateKey)
    }
    return global.dummySigner
}

export function getDummyContractUTXO(satoshis: number): UTXO {
    return Object.assign({}, dummyUTXO, { satoshis })
}
