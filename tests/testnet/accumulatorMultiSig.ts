import { AccumulatorMultiSig } from '../../src/contracts/accumulatorMultiSig'
import {
    getDefaultSigner,
    inputSatoshis,
    randomPrivateKey,
} from '../utils/helper'
import {
    bsv,
    findSig,
    FixedArray,
    getDummySig,
    MethodCallOptions,
    PubKey,
    PubKeyHash,
    toHex,
} from 'scrypt-ts'

async function main() {
    await AccumulatorMultiSig.compile()

    const [privateKey1, publicKey1, publicKeyHash1] = randomPrivateKey()
    const [privateKey2, publicKey2, publicKeyHash2] = randomPrivateKey()
    const [privateKey3, publicKey3, publicKeyHash3] = randomPrivateKey()

    const pubKeyHashes = [publicKeyHash1, publicKeyHash2, publicKeyHash3].map(
        (pkh) => PubKeyHash(toHex(pkh))
    ) as FixedArray<PubKeyHash, typeof AccumulatorMultiSig.N>

    const accumulatorMultiSig = new AccumulatorMultiSig(2n, pubKeyHashes)

    const signer = await getDefaultSigner([
        privateKey1,
        privateKey2,
        privateKey3,
    ])

    // connect to a signer
    await accumulatorMultiSig.connect(signer)

    // deploy
    const deployTx = await accumulatorMultiSig.deploy(inputSatoshis)
    console.log('AccumulatorMultiSig contract deployed: ', deployTx.id)

    // set one random mask index to be false to mark an invalid signature.
    const masks = [true, false, true]

    const pubKeys = [publicKey1, publicKey2, publicKey3].map((pk) => {
        return PubKey(pk.toString())
    }) as FixedArray<PubKey, typeof AccumulatorMultiSig.N>

    // call
    const { tx: callTx } = await accumulatorMultiSig.methods.main(
        pubKeys,
        (sigResps) => {
            return pubKeys.map((pubKey) => {
                try {
                    return findSig(sigResps, bsv.PublicKey.fromString(pubKey))
                } catch (error) {
                    return getDummySig()
                }
            })
        },
        masks,
        {
            pubKeyOrAddrToSign: pubKeys
                .filter((_, idx) => masks[idx])
                .map((pubkey) => bsv.PublicKey.fromString(pubkey)),
        } as MethodCallOptions<AccumulatorMultiSig>
    )
    console.log('AccumulatorMultiSig contract called: ', callTx.id)
}

describe('Test SmartContract `AccumulatorMultiSig` on testnet', () => {
    it('should succeed', async () => {
        await main()
    })
})
