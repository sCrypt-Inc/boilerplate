import { expect } from 'chai'
import { SocialRecovery } from '../../src/contracts/socialRecovery'
import { getDummySigner, getDummyUTXO } from '../utils/helper'
import {
    bsv,
    FixedArray,
    MethodCallOptions,
    PubKey,
    findSig,
    Sig,
    ByteString,
} from 'scrypt-ts'

const dummySig = '' as ByteString // Must be empty ByteString. See https://scrypt.io/docs/how-to-write-a-contract/built-ins/#checksig

describe('Test SmartContract `SocialRecovery`', () => {
    let signer: bsv.PrivateKey

    const guardians: bsv.PrivateKey[] = []
    const guardianPublicKeys: bsv.PublicKey[] = []
    let guardianPubKeys: FixedArray<PubKey, typeof SocialRecovery.N_GUARDIANS>

    let socialRecovery: SocialRecovery

    before(async () => {
        signer = bsv.PrivateKey.fromRandom()

        const _guardianPubKeys = []
        for (let i = 0; i < SocialRecovery.N_GUARDIANS; i++) {
            const privKey = bsv.PrivateKey.fromRandom()
            const pubKey = privKey.toPublicKey()
            guardians.push(privKey)
            guardianPublicKeys.push(pubKey)
            _guardianPubKeys.push(PubKey(pubKey.toHex()))
        }

        guardianPubKeys = _guardianPubKeys as FixedArray<
            PubKey,
            typeof SocialRecovery.N_GUARDIANS
        >

        await SocialRecovery.compile()
        socialRecovery = new SocialRecovery(
            PubKey(signer.toPublicKey().toHex()),
            guardianPubKeys
        )
    })

    it('should pass signing public key unlock.', async () => {
        await socialRecovery.connect(getDummySigner(signer))

        const { tx: callTx, atInputIndex } =
            await socialRecovery.methods.unlock(
                (sigResps) => findSig(sigResps, signer.toPublicKey()),
                // Method call options:
                {
                    fromUTXO: getDummyUTXO(),
                    pubKeyOrAddrToSign: signer.toPublicKey(),
                } as MethodCallOptions<SocialRecovery>
            )

        const result = callTx.verifyScript(atInputIndex)
        expect(result.success, result.error).to.eq(true)
    })

    it('should fail signing public key unlock with wrong key.', async () => {
        const wrongKey = bsv.PrivateKey.fromRandom()
        await socialRecovery.connect(getDummySigner(wrongKey))

        return expect(
            socialRecovery.methods.unlock(
                (sigResps) => findSig(sigResps, wrongKey.toPublicKey()),
                // Method call options:
                {
                    fromUTXO: getDummyUTXO(),
                    pubKeyOrAddrToSign: wrongKey.toPublicKey(),
                } as MethodCallOptions<SocialRecovery>
            )
        ).to.be.rejectedWith(/signature check failed/)
    })

    it('should pass updating signing key when threshold reached.', async () => {
        const newSigner = bsv.PrivateKey.fromRandom()
        await socialRecovery.connect(getDummySigner(guardians))

        // Get next iteration of the contract with updated signer pubkey value.
        const next = socialRecovery.next()
        next.signingPubKey = PubKey(newSigner.toPublicKey().toHex())

        const balance = 1000
        const fromUTXO = getDummyUTXO(balance)

        const { tx: callTx, atInputIndex } =
            await socialRecovery.methods.updateSigningPubKey(
                next.signingPubKey,
                (sigResps) => {
                    const sigs: Sig[] = []
                    const guardianSigs = sigResps.map((sigObj) =>
                        Sig(sigObj.sig)
                    )
                    for (
                        let i = 0;
                        i < SocialRecovery.GUARDIAN_THRESHOLD;
                        i++
                    ) {
                        sigs.push(guardianSigs[i])
                    }
                    return sigs
                },
                // Method call options:
                {
                    fromUTXO: fromUTXO,
                    pubKeyOrAddrToSign: guardianPublicKeys,
                    next: {
                        instance: next,
                        balance: balance,
                        atOutputIndex: fromUTXO.outputIndex,
                    },
                } as MethodCallOptions<SocialRecovery>
            )

        const result = callTx.verifyScript(atInputIndex)
        expect(result.success, result.error).to.eq(true)
    })

    it('should fail updating signing key when threshold not reached.', async () => {
        const newSigner = bsv.PrivateKey.fromRandom()

        // Get next iteration of the contract with updated signer pubkey value.
        const next = socialRecovery.next()
        next.signingPubKey = PubKey(newSigner.toPublicKey().toHex())

        const balance = 1000
        const fromUTXO = getDummyUTXO(balance)

        return expect(
            socialRecovery.methods.updateSigningPubKey(
                next.signingPubKey,
                (sigResps) => {
                    const guardianSigs: Sig[] = []
                    for (
                        let i = 0;
                        i < SocialRecovery.GUARDIAN_THRESHOLD;
                        i++
                    ) {
                        // Push same sig three times. This should cause checkMultSig() to fail.
                        guardianSigs.push(sigResps[0].sig)
                    }
                    return guardianSigs
                },
                // Method call options:
                {
                    fromUTXO: fromUTXO,
                    pubKeyOrAddrToSign: guardianPublicKeys,
                    next: {
                        instance: next,
                        balance: balance,
                        atOutputIndex: fromUTXO.outputIndex,
                    },
                } as MethodCallOptions<SocialRecovery>
            )
        ).to.be.rejectedWith(/Guardian threshold not reached/)
    })
})
