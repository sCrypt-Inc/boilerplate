import { expect } from 'chai'
import {
    findSig,
    FixedArray,
    MethodCallOptions,
    PubKey,
    PubKeyHash,
    toHex,
} from 'scrypt-ts'
import { MultiSig } from '../../src/contracts/multiSig'
import { dummySigner, dummyUTXO, randomPrivateKey } from './util/txHelper'
import { myPublicKey } from '../util/privateKey'

describe('Test SmartContract `MultiSig`', () => {
    const [privateKey1, publicKey1, publicKeyHash1] = randomPrivateKey()
    const [privateKey2, publicKey2, publicKeyHash2] = randomPrivateKey()
    const [privateKey3, publicKey3, publicKeyHash3] = randomPrivateKey()

    const pubKeyHashes = [publicKeyHash1, publicKeyHash2, publicKeyHash3].map(
        (pkh) => PubKeyHash(toHex(pkh))
    ) as FixedArray<PubKeyHash, typeof MultiSig.N>

    const correctPublicKeys = [publicKey1, publicKey2, publicKey3]
    const incorrectPublicKeys = [publicKey1, myPublicKey, publicKey3]

    let multiSig: MultiSig

    before(async () => {
        await MultiSig.compile()
        multiSig = new MultiSig(pubKeyHashes)

        const signer = dummySigner([privateKey1, privateKey2, privateKey3])
        await multiSig.connect(signer)
    })

    it('should succeed with all correct signatures', async () => {
        const { tx: callTx, atInputIndex } = await multiSig.methods.unlock(
            (sigResps) =>
                correctPublicKeys.map((pubKey) => findSig(sigResps, pubKey)),
            correctPublicKeys.map((pk) => PubKey(pk.toString())) as FixedArray<
                PubKey,
                typeof MultiSig.N
            >,
            {
                fromUTXO: dummyUTXO,
                pubKeyOrAddrToSign: correctPublicKeys,
            } as MethodCallOptions<MultiSig>
        )

        const result = callTx.verifyInputScript(atInputIndex)
        expect(result.success, result.error).to.eq(true)
    })

    it('should fail with a wrong signature', () => {
        expect(
            multiSig.methods.unlock(
                (sigResps) =>
                    incorrectPublicKeys.map((pubKey) =>
                        findSig(sigResps, pubKey)
                    ),
                correctPublicKeys.map((pk) =>
                    PubKey(pk.toString())
                ) as FixedArray<PubKey, typeof MultiSig.N>,
                {
                    fromUTXO: dummyUTXO,
                    pubKeyOrAddrToSign: incorrectPublicKeys,
                } as MethodCallOptions<MultiSig>
            )
        ).to.be.rejectedWith(/Check multisig failed/)
    })

    it('should fail with a wrong public key', () => {
        expect(
            multiSig.methods.unlock(
                (sigResps) =>
                    correctPublicKeys.map((pubKey) =>
                        findSig(sigResps, pubKey)
                    ),
                incorrectPublicKeys.map((pk) =>
                    PubKey(pk.toString())
                ) as FixedArray<PubKey, typeof MultiSig.N>,
                {
                    fromUTXO: dummyUTXO,
                    pubKeyOrAddrToSign: correctPublicKeys,
                } as MethodCallOptions<MultiSig>
            )
        ).to.be.rejectedWith(/public key hashes are not equal/)
    })
})
