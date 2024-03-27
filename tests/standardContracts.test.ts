import { expect, use } from 'chai'
import chaiAsPromised from 'chai-as-promised'
import {
    findSig,
    MethodCallOptions,
    PubKey,
    bsv,
    toHex,
    pubKey2Addr,
    P2PKH,
    P2PK,
} from 'scrypt-ts'
import { getDefaultSigner } from './utils/helper'

use(chaiAsPromised)

describe('Test Standard Contracts', () => {
    it('P2PKH', async () => {
        const privateKey = bsv.PrivateKey.fromRandom(bsv.Networks.testnet)
        const publicKey = privateKey.toPublicKey()
        const pubKey = PubKey(toHex(publicKey))
        // create an P2PKH instance
        const instance = new P2PKH(pubKey2Addr(pubKey))
        // connect the contract instance to a signer
        await instance.connect(getDefaultSigner(privateKey))
        // deploy the contract
        await instance.deploy()
        // call the P2PKH contract
        const callContract = async () =>
            instance.methods.unlock(
                (sigResps) => findSig(sigResps, publicKey),
                pubKey,
                {
                    pubKeyOrAddrToSign: publicKey,
                } as MethodCallOptions<P2PKH>
            )
        return expect(callContract()).not.rejected
    })

    it('P2PK', async () => {
        const privateKey = bsv.PrivateKey.fromRandom(bsv.Networks.testnet)
        const publicKey = privateKey.toPublicKey()
        const pubKey = PubKey(toHex(publicKey))
        // create an P2PK instance
        const instance = new P2PK(pubKey)
        // connect the contract instance to a signer
        await instance.connect(getDefaultSigner(privateKey))
        // deploy the contract
        await instance.deploy()
        // call the P2PK contract
        const callContract = async () =>
            instance.methods.unlock(
                (sigResps) => findSig(sigResps, publicKey),
                {
                    pubKeyOrAddrToSign: publicKey,
                } as MethodCallOptions<P2PK>
            )
        return expect(callContract()).not.rejected
    })
})
