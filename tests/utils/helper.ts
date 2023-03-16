import {
    bsv,
    DefaultProvider,
    DummyProvider,
    TestWallet,
    UTXO,
} from 'scrypt-ts'
import { randomBytes } from 'crypto'
import { myPrivateKey } from './privateKey'

export const inputSatoshis = 10000

export const sleep = async (seconds: number) => {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({})
        }, seconds * 1000)
    })
}

export function randomPrivateKey() {
    const privateKey = bsv.PrivateKey.fromRandom('testnet')
    const publicKey = bsv.PublicKey.fromPrivateKey(privateKey)
    const publicKeyHash = bsv.crypto.Hash.sha256ripemd160(publicKey.toBuffer())
    const address = publicKey.toAddress()
    return [privateKey, publicKey, publicKeyHash, address] as const
}

export function getDefaultSigner(
    privateKey?: bsv.PrivateKey | bsv.PrivateKey[]
): TestWallet {
    if (global.testnetSigner === undefined) {
        global.testnetSigner = new TestWallet(
            myPrivateKey,
            new DefaultProvider()
        )
    }
    if (privateKey !== undefined) {
        global.testnetSigner.addPrivateKey(privateKey)
    }
    return global.testnetSigner
}

export const dummyUTXO = {
    txId: randomBytes(32).toString('hex'),
    outputIndex: 0,
    script: '', // placeholder
    satoshis: inputSatoshis,
}

export function getDummyUTXO(
    satoshis: number = inputSatoshis,
    unique = false
): UTXO {
    if (unique) {
        return Object.assign({}, dummyUTXO, {
            satoshis,
            txId: randomBytes(32).toString('hex'),
        })
    }
    return Object.assign({}, dummyUTXO, { satoshis })
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
