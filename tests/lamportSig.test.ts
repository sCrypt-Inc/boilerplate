import { expect, use } from 'chai'
import {
    ByteString,
    FixedArray,
    MethodCallOptions,
    bsv,
    byteString2Int,
    fill,
    hash256,
    lshift,
    sha256,
    slice,
    toByteString,
} from 'scrypt-ts'
import {
    LamportP2PK,
    LamportPubKey,
    LamportSig,
} from '../src/contracts/lamportSig'
import { getDefaultSigner } from './utils/helper'
import chaiAsPromised from 'chai-as-promised'
import { and, getPreimage } from 'scryptlib'
import { off } from 'process'
use(chaiAsPromised)

type LamportSecretKey = ByteString

describe('Heavy: Test SmartContract `LamportSig`', () => {
    let sk: LamportSecretKey
    let pk: LamportPubKey

    let instance: LamportP2PK

    before(async () => {
        await LamportP2PK.loadArtifact()

        sk = toByteString('')
        pk = toByteString('')
        for (let i = 0; i < 512; i++) {
            const skChunk = bsv.PrivateKey.fromRandom().toByteString()
            sk += skChunk
            pk += hash256(skChunk)
        }

        instance = new LamportP2PK(pk)
        await instance.connect(getDefaultSigner())
    })

    it('should pass the public method unit test successfully.', async () => {
        const paymentAmt = 100

        const deployTx = await instance.deploy(paymentAmt)
        console.log(`Deployed contract "LamportSig": ${deployTx.id}`)

        // Create unsigned TX to get sighHash preimage.
        const dummySig: LamportSig = toByteString('')
        const dummyCallRes = await instance.methods.unlock(dummySig, {
            partiallySigned: true,
            exec: false,
            autoPayFee: false,
        } as MethodCallOptions<LamportP2PK>)

        // Sign tx.
        let sig: LamportSig = toByteString('')
        const txSigHashPreimage = getPreimage(
            dummyCallRes.tx,
            instance.lockingScript,
            paymentAmt,
            0
        )
        const m = byteString2Int(hash256(txSigHashPreimage))
        for (let i = 0; i < 256; i++) {
            let offset = 0n
            if (and(lshift(m, BigInt(i)), 1n) == 0n) {
                offset = 256n * 32n
            }

            const start = BigInt(i) * 32n
            const skChunkStart = start + offset
            sig += slice(sk, skChunkStart, skChunkStart + 32n)
        }

        // Execute actual contract call.
        const call = async () => {
            const callRes = await instance.methods.unlock(sig, {
                partiallySigned: true,
                autoPayFee: false,
            } as MethodCallOptions<LamportP2PK>)

            console.log(`Called "unlock" method: ${callRes.tx.id}`)
        }
        await expect(call()).not.to.be.rejected
    })

    it('should throw with wrong sig.', async () => {
        const paymentAmt = 100

        const deployTx = await instance.deploy(paymentAmt)
        console.log(`Deployed contract "LamportSig": ${deployTx.id}`)

        // Create unsigned TX to get sighHash preimage.
        const dummySig: LamportSig = toByteString('')
        const dummyCallRes = await instance.methods.unlock(dummySig, {
            partiallySigned: true,
            exec: false,
            autoPayFee: false,
        } as MethodCallOptions<LamportP2PK>)

        // Sign tx.
        let sig: LamportSig = toByteString('')
        const txSigHashPreimage = getPreimage(
            dummyCallRes.tx,
            instance.lockingScript,
            paymentAmt,
            0
        )
        const m = byteString2Int(hash256(txSigHashPreimage))
        for (let i = 0; i < 256; i++) {
            let offset = 0n
            if (and(lshift(m, BigInt(i)), 1n) == 0n) {
                offset = 256n * 32n
            }

            const start = BigInt(i) * 32n
            const skChunkStart = start + offset
            sig += slice(sk, skChunkStart, skChunkStart + 32n)
        }

        sig =
            slice(sig, 0n, 32n) +
            toByteString('00').repeat(32) +
            slice(sig, 64n)

        // Execute actual contract call.
        const call = async () => {
            const callRes = await instance.methods.unlock(sig, {
                partiallySigned: true,
                autoPayFee: false,
            } as MethodCallOptions<LamportP2PK>)

            console.log(`Called "unlock" method: ${callRes.tx.id}`)
        }
        await expect(call()).to.be.rejectedWith(/sig chunk 1 hash mismatch/)
    })
})
