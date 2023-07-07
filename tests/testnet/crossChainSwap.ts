import { CrossChainSwap } from '../../src/contracts/crossChainSwap'
import { getDefaultSigner, inputSatoshis } from '../utils/helper'
import {
    MethodCallOptions,
    PubKey,
    bsv,
    findSig,
    sha256,
    toByteString,
} from 'scrypt-ts'

async function main(methodName: string) {
    const alicePrivKey = bsv.PrivateKey.fromRandom(bsv.Networks.testnet)
    const alicePubKey = alicePrivKey.publicKey

    const bobPrivKey = bsv.PrivateKey.fromRandom(bsv.Networks.testnet)
    const bobPubKey = bobPrivKey.publicKey

    const x = toByteString(
        'f00cfd8df5f92d5e94d1ecbd9b427afd14e03f8a3292ca4128cd59ef7b9643bc'
    )
    const xHash = sha256(x)

    const lockTimeMin = 1673510000n

    await CrossChainSwap.compile()

    const crossChainSwap = new CrossChainSwap(
        PubKey(alicePubKey.toHex()),
        PubKey(bobPubKey.toHex()),
        xHash,
        lockTimeMin
    )

    // Connect Bob signer.
    await crossChainSwap.connect(getDefaultSigner(bobPrivKey))

    // Contract deployment.
    const deployTx = await crossChainSwap.deploy(inputSatoshis)
    console.log('CrossChainSwap contract deployed: ', deployTx.id)

    if (methodName == 'unlock') {
        // Alice unlocks contract and takes the funds.
        await crossChainSwap.connect(getDefaultSigner(alicePrivKey))

        const { tx: callTx, atInputIndex } =
            await crossChainSwap.methods.unlock(
                x,
                (sigResps) => findSig(sigResps, alicePubKey),
                {
                    pubKeyOrAddrToSign: alicePubKey,
                } as MethodCallOptions<CrossChainSwap>
            )
        console.log('CrossChainSwap "unlock" method called: ', callTx.id)
    } else {
        // Bob withdraws after timeout passed.
        const { tx: callTx, atInputIndex } =
            await crossChainSwap.methods.cancel(
                (sigResps) => findSig(sigResps, bobPubKey),
                {
                    lockTime: 1673523720,
                    pubKeyOrAddrToSign: bobPubKey,
                } as MethodCallOptions<CrossChainSwap>
            )
        console.log('CrossChainSwap "cancel" method called: ', callTx.id)
    }
}

describe('Test SmartContract `CrossChainSwap` on testnet', () => {
    it('should succeed', async () => {
        await main('unlock')
        await main('cancel')
    })
})
