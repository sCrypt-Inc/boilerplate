import { expect, use } from 'chai'
import chaiAsPromised from 'chai-as-promised'
import { SocialRecovery } from '../src/contracts/socialRecovery'
import { getDefaultSigner } from './utils/helper'
import {
    bsv,
    FixedArray,
    MethodCallOptions,
    PubKey,
    findSig,
    Sig,
} from 'scrypt-ts'
import { myPrivateKey } from './utils/privateKey'

use(chaiAsPromised)
describe('Test SmartContract `SocialRecovery`', () => {
    const signerKey: bsv.PrivateKey = myPrivateKey

    const guardians: bsv.PrivateKey[] = []
    const guardianPublicKeys: bsv.PublicKey[] = []
    let guardianPubKeys: FixedArray<PubKey, typeof SocialRecovery.N_GUARDIANS>

    let socialRecovery: SocialRecovery

    before(() => {
        const _guardianPubKeys: Array<PubKey> = []
        for (let i = 0; i < SocialRecovery.N_GUARDIANS; i++) {
            const privKey = bsv.PrivateKey.fromRandom(bsv.Networks.testnet)
            const pubKey = privKey.toPublicKey()
            guardians.push(privKey)
            guardianPublicKeys.push(pubKey)
            _guardianPubKeys.push(PubKey(pubKey.toByteString()))
        }

        guardianPubKeys = _guardianPubKeys as FixedArray<
            PubKey,
            typeof SocialRecovery.N_GUARDIANS
        >

        SocialRecovery.loadArtifact()
        socialRecovery = new SocialRecovery(
            PubKey(signerKey.publicKey.toByteString()),
            guardianPubKeys
        )
    })

    it('should pass signing public key unlock.', async () => {
        await socialRecovery.connect(getDefaultSigner(signerKey))
        await socialRecovery.deploy(1)
        const callContract = async () =>
            socialRecovery.methods.unlock(
                (sigResps) => findSig(sigResps, signerKey.toPublicKey()),
                // Method call options:
                {
                    pubKeyOrAddrToSign: signerKey.toPublicKey(),
                } as MethodCallOptions<SocialRecovery>
            )
        return expect(callContract()).not.rejected
    })

    it('should fail signing public key unlock with wrong key.', async () => {
        const wrongKey = bsv.PrivateKey.fromRandom(bsv.Networks.testnet)
        await socialRecovery.connect(getDefaultSigner(wrongKey))
        await socialRecovery.deploy(1)
        const callContract = async () =>
            socialRecovery.methods.unlock(
                (sigResps) => findSig(sigResps, wrongKey.toPublicKey()),
                // Method call options:
                {
                    pubKeyOrAddrToSign: wrongKey.toPublicKey(),
                } as MethodCallOptions<SocialRecovery>
            )
        return expect(callContract()).to.be.rejectedWith(
            /signature check failed/
        )
    })

    it('should pass updating signing key when threshold reached.', async () => {
        const newSigner = bsv.PrivateKey.fromRandom(bsv.Networks.testnet)
        await socialRecovery.connect(getDefaultSigner(guardians))
        await socialRecovery.deploy(1)
        // Get next iteration of the contract with updated signer pubkey value.
        const next = socialRecovery.next()
        next.signingPubKey = PubKey(newSigner.publicKey.toByteString())

        const callContract = async () =>
            socialRecovery.methods.updateSigningPubKey(
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
                    pubKeyOrAddrToSign: guardianPublicKeys,
                    next: {
                        instance: next,
                        balance: socialRecovery.balance,
                    },
                } as MethodCallOptions<SocialRecovery>
            )
        return expect(callContract()).not.rejected
    })

    it('should fail updating signing key when threshold not reached.', async () => {
        const newSigner = bsv.PrivateKey.fromRandom(bsv.Networks.testnet)

        // Get next iteration of the contract with updated signer pubkey value.
        const next = socialRecovery.next()
        next.signingPubKey = PubKey(newSigner.publicKey.toByteString())

        const callContract = async () =>
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
                    pubKeyOrAddrToSign: guardianPublicKeys,
                    next: {
                        instance: next,
                        balance: socialRecovery.balance,
                    },
                } as MethodCallOptions<SocialRecovery>
            )

        return expect(callContract()).to.be.rejectedWith(
            /Guardian threshold not reached/
        )
    })
})
