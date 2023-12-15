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
use(chaiAsPromised)

type LamportSecretKey = FixedArray<ByteString, 512>

describe('Heavy: Test SmartContract `LamportSig`', () => {
    let sk: LamportSecretKey
    let pk: LamportPubKey

    let instance: LamportP2PK

    before(async () => {
        await LamportP2PK.loadArtifact()

        sk = fill(bsv.PrivateKey.fromRandom().toByteString(), 512)
        pk = fill(toByteString(''), 512)
        for (let i = 0; i < 512; i++) {
            pk[i] = hash256(sk[i])
        }

        instance = new LamportP2PK(pk)
        await instance.connect(getDefaultSigner())
    })

    it('should pass the public method unit test successfully.', async () => {
        const paymentAmt = 100

        const deployTx = await instance.deploy(paymentAmt)
        console.log(`Deployed contract "LamportSig": ${deployTx.id}`)

        // Create unsigned TX to get sighHash preimage.
        const dummySig: LamportSig = fill(toByteString(''), 256)
        const dummyCallRes = await instance.methods.unlock(dummySig, {
            partiallySigned: true,
            exec: false,
            autoPayFee: false,
        } as MethodCallOptions<LamportP2PK>)

        // Sign tx.
        const sig: LamportSig = fill(toByteString(''), 256)
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
                offset = 256n
            }
            sig[i] = sk[Number(offset) + i]
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
        const dummySig: LamportSig = fill(toByteString(''), 256)
        const dummyCallRes = await instance.methods.unlock(dummySig, {
            partiallySigned: true,
            exec: false,
            autoPayFee: false,
        } as MethodCallOptions<LamportP2PK>)

        // Sign tx.
        const sig: LamportSig = fill(toByteString(''), 256)
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
                offset = 256n
            }
            sig[i] = sk[Number(offset) + i]
        }

        sig[3] = toByteString(hash256(toByteString('wrong data')))

        // Execute actual contract call.
        const call = async () => {
            const callRes = await instance.methods.unlock(sig, {
                partiallySigned: true,
                autoPayFee: false,
            } as MethodCallOptions<LamportP2PK>)

            console.log(`Called "unlock" method: ${callRes.tx.id}`)
        }
        await expect(call()).to.be.rejectedWith(/sig chunk 3 hash mismatch/)
    })
})
