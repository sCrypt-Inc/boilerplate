import { DummyProvider, DefaultProvider, TestWallet, bsv } from 'scrypt-ts'
import { myPrivateKey } from './privateKey'

import * as dotenv from 'dotenv'

// Load the .env file
dotenv.config()

const wallets: Record<string, TestWallet> = {
    testnet: new TestWallet(
        myPrivateKey,
        new DefaultProvider({
            network: bsv.Networks.testnet,
        })
    ),
    local: new TestWallet(myPrivateKey, new DummyProvider()),
    mainnet: new TestWallet(
        myPrivateKey,
        new DefaultProvider({
            network: bsv.Networks.mainnet,
        })
    ),
}
export function getDefaultSigner(
    privateKey?: bsv.PrivateKey | bsv.PrivateKey[]
): TestWallet {
    const network = process.env.NETWORK || 'local'

    const wallet = wallets[network]

    if (privateKey) {
        wallet.addPrivateKey(privateKey)
    }

    return wallet
}

export function resetDefaultSigner() {
    const network = process.env.NETWORK || 'local'
    const wallet = wallets[network]
    if (wallet['_utxoManagers']) {
        wallet['_utxoManagers'].clear()
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

export function getRandomInt(min: number, max: number) {
    min = Math.ceil(min)
    max = Math.floor(max)
    return Math.floor(Math.random() * (max - min) + min) // The maximum is exclusive and the minimum is inclusive
}
