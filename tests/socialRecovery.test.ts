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

use(chaiAsPromised)
describe('Test SmartContract `SocialRecovery`', () => {
    let signer: bsv.PrivateKey

    const guardians: bsv.PrivateKey[] = []
    const guardianPublicKeys: bsv.PublicKey[] = []
    let guardianPubKeys: FixedArray<PubKey, typeof SocialRecovery.N_GUARDIANS>

    let socialRecovery: SocialRecovery

    before(async () => {
        signer = bsv.PrivateKey.fromRandom(bsv.Networks.testnet)

        const _guardianPubKeys: Array<PubKey> = []
        for (let i = 0; i < SocialRecovery.N_GUARDIANS; i++) {
            const privKey = bsv.PrivateKey.fromRandom(bsv.Networks.testnet)
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
        await socialRecovery.connect(getDefaultSigner(signer))
        const deployTx = await socialRecovery.deploy(1)
        console.log('SocialRecovery contract deployed: ', deployTx.id)
        const { tx: callTx, atInputIndex } =
            await socialRecovery.methods.unlock(
                (sigResps) => findSig(sigResps, signer.toPublicKey()),
                // Method call options:
                {
                    pubKeyOrAddrToSign: signer.toPublicKey(),
                } as MethodCallOptions<SocialRecovery>
            )
        console.log('SocialRecovery contract called: ', callTx.id)
        const result = callTx.verifyScript(atInputIndex)
        expect(result.success, result.error).to.eq(true)
    })

    it('should fail signing public key unlock with wrong key.', async () => {
        const wrongKey = bsv.PrivateKey.fromRandom(bsv.Networks.testnet)
        await socialRecovery.connect(getDefaultSigner(wrongKey))
        const deployTx = await socialRecovery.deploy(1)
        console.log('SocialRecovery contract deployed: ', deployTx.id)
        return expect(
            socialRecovery.methods.unlock(
                (sigResps) => findSig(sigResps, wrongKey.toPublicKey()),
                // Method call options:
                {
                    pubKeyOrAddrToSign: wrongKey.toPublicKey(),
                } as MethodCallOptions<SocialRecovery>
            )
        ).to.be.rejectedWith(/signature check failed/)
    })

    it('should pass updating signing key when threshold reached.', async () => {
        const newSigner = bsv.PrivateKey.fromRandom(bsv.Networks.testnet)
        await socialRecovery.connect(getDefaultSigner(guardians))
        const deployTx = await socialRecovery.deploy(1)
        console.log('SocialRecovery contract deployed: ', deployTx.id)
        // Get next iteration of the contract with updated signer pubkey value.
        const next = socialRecovery.next()
        next.signingPubKey = PubKey(newSigner.toPublicKey().toHex())

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
                    pubKeyOrAddrToSign: guardianPublicKeys,
                    next: {
                        instance: next,
                        balance: socialRecovery.balance,
                    },
                } as MethodCallOptions<SocialRecovery>
            )
        console.log('SocialRecovery contract called: ', callTx.id)
        const result = callTx.verifyScript(atInputIndex)
        expect(result.success, result.error).to.eq(true)
    })

    it('should fail updating signing key when threshold not reached.', async () => {
        const newSigner = bsv.PrivateKey.fromRandom(bsv.Networks.testnet)

        // Get next iteration of the contract with updated signer pubkey value.
        const next = socialRecovery.next()
        next.signingPubKey = PubKey(newSigner.toPublicKey().toHex())

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
                    pubKeyOrAddrToSign: guardianPublicKeys,
                    next: {
                        instance: next,
                        balance: socialRecovery.balance,
                    },
                } as MethodCallOptions<SocialRecovery>
            )
        ).to.be.rejectedWith(/Guardian threshold not reached/)
    })
})
