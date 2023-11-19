import { PriceBet2 } from '../src/contracts/priceBet2'
import {
    ByteString,
    bsv,
    PubKey,
    byteString2Int,
    toByteString,
    MethodCallOptions,
    findSig,
} from 'scrypt-ts'
import { RabinPubKey, RabinSig } from 'scrypt-ts-lib'
import { expect, use } from 'chai'
import { getDefaultSigner } from './utils/helper'
import chaiAsPromised from 'chai-as-promised'
use(chaiAsPromised)

// All data was pre-fetched from https://oracle-demo.vercel.app/docs

// https://oracle-demo.vercel.app/info
const PUBKEY =
    '496297dbe0759a886eca725ade26baff74ceb23bf6113ce9a2857252ea25afc04fd66bece618c8e96c637f401ce4c21cc2129f62f323f92873ac3fc3f1f15bb921c4bef5c3d30d974208a9b0544cbfb82e73d1639f7329cd81a05c983f62e91673dc3d8e4a567a65f24fb9279ff88b84cf3d52fc2e8a107685dc2382e43a413b066f2bc20a42c15e8f43de1f2b4a6bfc441e6233fe87df8b45bb61238163875684fe0a088822b8597ca2c2e95ad09685206955b8f456bdf18c5f91d38404488571557ab045d03ce551eed96fcef40c0af2e681dfe4583a9121134379fc05f77b32718ac075911ce1fb258720362ada19ff6d92b0d1b8bc95db42076d03fdbac66933b00966cf9c1b5300999647134aaba7460521c3362596083646197d667c1d849f74ae1e0fc8160ff9812e8e12eef886a2662485798c5701f0721408d1c877a0165d1c1e754fcb4e502da16de648348584726bf3831fa4d7129ffe5bc34da51e3c1f1de22e0a8b86b4bfa0709dbea9b30307714a4cb8a28c270c7724f8d25e'
const RESP = {
    timestamp: 1700428685,
    tradingPair: 'BSV-USDC',
    price: 478400,
    decimal: 4,
    data: '028d7b5a65c04c070000000000044253562d55534443',
    signature: {
        s: '763e7453f6156fbcf7a063f42f1a73fd21758f0e31d4fee74ae040da73e0f3402abab3bff02ba662132283da5c5c1b7924cd2981d3da72af231a3ef9e9eb971bf3045e419f5f67b0814d1c77a98350b786c80ee6e94000b0e852268e9536e01651562dfee8a1c7988b0e0392fbc48bb64fcce9fa22fee6992fb4938637d063f7406db5b50df8608b696a17fe97fc06bfd2f812c92d4f1cca246d8d61a535f900aa72e7d91ce38c6b0f2746a1816fd8606c15ed0a1f9ced404c19ff4c4b96c5a7b6b1fa7e5e8ba1a82fb7fa1d06f3ed8cfaae3a1f7f55103e95281ba1a45eba7041d6e1fad5960605f8f7481208b5efbd168c9a38f3fdc5d7856a1778b37ad6859118dec36272ba801ac17f9e6ca84e7c30c05e81777d632e046173e629ca5276385f669169fac682d267b21214c8479536f6f8e62c9826e1785f23a0ce976183e289a0b25a4772a93369b3d5828c87b92a6d56e7720693e979dd903f7df749b71538c5703f2fb330887b532e72b1d005a191edc0142b336f1c958c487ef4a152',
        padding: '0000000000',
    },
}

describe('Test SmartContract `PriceBet2`', () => {
    let alicePrivKey: bsv.PrivateKey
    let bobPrivKey: bsv.PrivateKey

    let priceBet: PriceBet2

    const decimal = 4
    const currentPrice = Math.round(RESP.price * 10 ** decimal)

    before(() => {
        // Prepare inital data.
        alicePrivKey = bsv.PrivateKey.fromRandom(bsv.Networks.testnet)
        bobPrivKey = bsv.PrivateKey.fromRandom(bsv.Networks.testnet)
        const rabinPubKey: bigint = byteString2Int(PUBKEY + '00')

        const targetPriceFloat = 36.3 // USDC
        const targetPrice = Math.round(targetPriceFloat * 10 ** decimal)
        const timestampFrom = 1700352000n // Sun Nov 19 2023 00:00:00 GMT
        const timestampTo = 1700438400n // Mon Nov 20 2023 00:00:00 GMT
        const tradingPair = toByteString('BSV-USDC', true)

        PriceBet2.loadArtifact()
        priceBet = new PriceBet2(
            BigInt(targetPrice),
            BigInt(decimal),
            tradingPair,
            timestampFrom,
            timestampTo,
            rabinPubKey as RabinPubKey,
            PubKey(alicePrivKey.publicKey.toByteString()),
            PubKey(bobPrivKey.publicKey.toByteString())
        )
    })

    it('should pass w correct sig and data.', async () => {
        // Pick winner.
        const winner =
            currentPrice >= priceBet.targetPrice ? alicePrivKey : bobPrivKey
        const winnerPubKey = winner.publicKey

        // Connect signer.
        await priceBet.connect(getDefaultSigner(winner))
        await priceBet.deploy(1)

        const oracleSig: RabinSig = PriceBet2.parseSig(RESP.signature)

        const callContract = async () =>
            priceBet.methods.unlock(
                RESP.data as ByteString,
                oracleSig,
                (sigResps) => findSig(sigResps, winnerPubKey),
                // Method call options:
                {
                    pubKeyOrAddrToSign: winnerPubKey,
                } as MethodCallOptions<PriceBet2>
            )
        return expect(callContract()).not.rejected
    })

    it('should fail paying wrong player.', async () => {
        // Pick loser.
        const loser =
            currentPrice >= priceBet.targetPrice ? bobPrivKey : alicePrivKey
        const loserPubKey = loser.publicKey

        // Connect signer.
        await priceBet.connect(getDefaultSigner(loser))
        await priceBet.deploy(1)

        const oracleSig: RabinSig = PriceBet2.parseSig(RESP.signature)

        const callContract = async () =>
            priceBet.methods.unlock(
                RESP.data as ByteString,
                oracleSig,
                (sigResps) => findSig(sigResps, loserPubKey),
                // Method call options:
                {
                    pubKeyOrAddrToSign: loserPubKey,
                } as MethodCallOptions<PriceBet2>
            )

        return expect(callContract()).to.be.rejectedWith(
            /signature check failed/
        )
    })
})
