import { expect } from 'chai'
import {
    bsv,
    findSig,
    FixedArray,
    getDummySig,
    MethodCallOptions,
    ContractTransaction,
    PubKey,
    PubKeyHash,
    toHex,
} from 'scrypt-ts'
import { AccumulatorMultiSig } from '../../src/contracts/accumulatorMultiSig'
import { getDummySigner, getDummyUTXO, randomPrivateKey } from '../utils/helper'

const [privateKey1, publicKey1, publicKeyHash1] = randomPrivateKey()
const [privateKey2, publicKey2, publicKeyHash2] = randomPrivateKey()
const [privateKey3, publicKey3, publicKeyHash3] = randomPrivateKey()

const pubKeys = [publicKey1, publicKey2, publicKey3].map((pk) => {
    return PubKey(pk.toString())
}) as FixedArray<PubKey, typeof AccumulatorMultiSig.N>

const pubKeyHashes = [publicKeyHash1, publicKeyHash2, publicKeyHash3].map(
    (pkh) => PubKeyHash(toHex(pkh))
) as FixedArray<PubKeyHash, typeof AccumulatorMultiSig.N>

let accumulatorMultiSig: AccumulatorMultiSig

describe('Test SmartContract `AccumulatorMultiSig`', () => {
    before(async () => {
        await AccumulatorMultiSig.compile()
        accumulatorMultiSig = new AccumulatorMultiSig(2n, pubKeyHashes)

        const signer = getDummySigner([privateKey1, privateKey2, privateKey3])
        await accumulatorMultiSig.connect(signer)
    })

    it('should successfully with all three right.', async () => {
        const { tx: callTx, atInputIndex } = await call([true, true, true])
        const result = callTx.verifyScript(atInputIndex)
        expect(result.success, result.error).to.eq(true)
    })

    it('should successfully with two right.', async () => {
        const { tx: callTx, atInputIndex } = await call([true, false, true])
        const result = callTx.verifyScript(atInputIndex)
        expect(result.success, result.error).to.eq(true)
    })

    it('should throw with only one right.', async () => {
        return expect(call([false, true, false])).to.be.rejectedWith(
            /the number of signatures does not meet the threshold limit/
        )
    })
})

async function call(
    masks: FixedArray<boolean, typeof AccumulatorMultiSig.N>
): Promise<ContractTransaction> {
    return accumulatorMultiSig.methods.main(
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
            fromUTXO: getDummyUTXO(),
            pubKeyOrAddrToSign: pubKeys
                .filter((_, idx) => masks[idx])
                .map((pubkey) => bsv.PublicKey.fromString(pubkey)),
        } as MethodCallOptions<AccumulatorMultiSig>
    )
}
