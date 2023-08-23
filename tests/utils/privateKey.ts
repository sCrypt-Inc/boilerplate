import { bsv } from 'scrypt-ts'
import * as dotenv from 'dotenv'
import * as fs from 'fs'

export function genPrivKey(network: bsv.Networks.Network): bsv.PrivateKey {
    const testnetConfigPath = '.env'
    const mainnetConfigPath = '.env.mainnet'

    dotenv.config({
        path:
            network === bsv.Networks.testnet
                ? testnetConfigPath
                : mainnetConfigPath,
    })

    const privKeyStr = process.env.PRIVATE_KEY
    let privKey: bsv.PrivateKey
    if (privKeyStr) {
        privKey = bsv.PrivateKey.fromWIF(privKeyStr as string)
        console.log(
            `${
                network === bsv.Networks.testnet ? 'Testnet' : 'Mainnet'
            } private key already present ...`
        )
    } else {
        privKey = bsv.PrivateKey.fromRandom(network)
        console.log(
            `${
                network === bsv.Networks.testnet ? 'Testnet' : 'Mainnet'
            } private key generated and saved in "${
                network == bsv.Networks.testnet
                    ? testnetConfigPath
                    : mainnetConfigPath
            }"`
        )
        console.log(`Publickey: ${privKey.publicKey}`)
        console.log(`Address: ${privKey.toAddress()}`)
        fs.writeFileSync(
            network === bsv.Networks.testnet
                ? testnetConfigPath
                : mainnetConfigPath,
            `PRIVATE_KEY="${privKey}"`
        )
    }

    const fundMessage =
        network === bsv.Networks.testnet
            ? `You can fund its address '${privKey.toAddress()}' from the sCrypt faucet https://scrypt.io/faucet`
            : `You can fund its address '${privKey.toAddress()}' with your wallet.`

    console.log(fundMessage)

    if (network === bsv.Networks.mainnet) {
        console.log(
            'Be careful: do NOT fund too much coin. Only for testing in development, no security guarantees.'
        )
    }

    return privKey
}

export const myPrivateKey = genPrivKey(
    bsv.Networks.get(process.env.NETWORK || 'testnet')
)
export const myPublicKey = bsv.PublicKey.fromPrivateKey(myPrivateKey)
export const myPublicKeyHash = bsv.crypto.Hash.sha256ripemd160(
    myPublicKey.toBuffer()
)
export const myAddress = myPublicKey.toAddress()
