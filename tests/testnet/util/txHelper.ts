import { bsv, TestWallet, UTXO, WhatsonchainProvider } from 'scrypt-ts'
import { myPrivateKey } from '../../util/privateKey'
import axios from 'axios'

const API_PREFIX = 'https://api.whatsonchain.com/v1/bsv/test'

export const inputSatoshis = 10000

export async function fetchUtxos(
    address: string = myPrivateKey.toAddress().toString()
): Promise<UTXO[]> {
    const url = `${API_PREFIX}/address/${address}/unspent`
    const { data: utxos } = await axios.get(url)
    return utxos.map((utxo: Record<string, unknown>) => ({
        txId: utxo.tx_hash,
        outputIndex: utxo.tx_pos,
        satoshis: utxo.value,
        script: bsv.Script.buildPublicKeyHashOut(address).toHex(),
    }))
}

export async function sendTx(tx: bsv.Transaction): Promise<string> {
    try {
        const { data: txid } = await axios.post(`${API_PREFIX}/tx/raw`, {
            txhex: tx.toString(),
        })
        return txid
    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.log('sendTx error', error.response.data)
        }

        throw error
    }
}

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

export function getTestnetSigner(
    privateKey?: bsv.PrivateKey | bsv.PrivateKey[]
): TestWallet {
    if (global.testnetSigner === undefined) {
        global.testnetSigner = new TestWallet(
            myPrivateKey,
            new WhatsonchainProvider(bsv.Networks.testnet)
        )
    }
    if (privateKey !== undefined) {
        global.testnetSigner.addPrivateKey(privateKey)
    }
    return global.testnetSigner
}
