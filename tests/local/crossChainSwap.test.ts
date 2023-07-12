import { expect } from 'chai'
import { CrossChainSwap } from '../../src/contracts/crossChainSwap'
import { getDummySigner, getDummyUTXO } from '../utils/helper'
import {
    MethodCallOptions,
    PubKey,
    bsv,
    findSig,
    sha256,
    toByteString,
} from 'scrypt-ts'

describe('Test SmartContract `CrossChainSwap`', () => {
    let crossChainSwap: CrossChainSwap
    const lockTimeMin = 1673510000n

    const alicePrivKey = bsv.PrivateKey.fromRandom(bsv.Networks.testnet)
    const alicePubKey = alicePrivKey.publicKey

    const bobPrivKey = bsv.PrivateKey.fromRandom(bsv.Networks.testnet)
    const bobPubKey = bobPrivKey.publicKey

    const x = toByteString(
        'f00cfd8df5f92d5e94d1ecbd9b427afd14e03f8a3292ca4128cd59ef7b9643bc'
    )
    const xHash = sha256(x)

    before(async () => {
        await CrossChainSwap.compile()

        crossChainSwap = new CrossChainSwap(
            PubKey(alicePubKey.toHex()),
            PubKey(bobPubKey.toHex()),
            xHash,
            lockTimeMin
        )
    })

    it('should pass unlock', async () => {
        await crossChainSwap.connect(getDummySigner(alicePrivKey))

        const { tx: callTx, atInputIndex } =
            await crossChainSwap.methods.unlock(
                x,
                (sigResps) => findSig(sigResps, alicePubKey),
                {
                    fromUTXO: getDummyUTXO(),
                    pubKeyOrAddrToSign: alicePubKey,
                } as MethodCallOptions<CrossChainSwap>
            )
        const result = callTx.verifyScript(atInputIndex)
        expect(result.success, result.error).to.eq(true)
    })

    it('should pass cancel', async () => {
        await crossChainSwap.connect(getDummySigner(bobPrivKey))

        const { tx: callTx, atInputIndex } =
            await crossChainSwap.methods.cancel(
                (sigResps) => findSig(sigResps, bobPubKey),
                {
                    fromUTXO: getDummyUTXO(),
                    lockTime: 1673523720,
                    pubKeyOrAddrToSign: bobPubKey,
                } as MethodCallOptions<CrossChainSwap>
            )
        const result = callTx.verifyScript(atInputIndex)
        expect(result.success, result.error).to.eq(true)
    })

    it('should fail withdraw when nLocktime is too low.', async () => {
        await crossChainSwap.connect(getDummySigner(bobPrivKey))

        return expect(
            crossChainSwap.methods.cancel(
                (sigResps) => findSig(sigResps, bobPubKey),
                {
                    fromUTXO: getDummyUTXO(),
                    lockTime: 1673500100,
                    pubKeyOrAddrToSign: bobPubKey,
                } as MethodCallOptions<CrossChainSwap>
            )
        ).to.be.rejectedWith(/locktime has not yet expired/)
    })
})
