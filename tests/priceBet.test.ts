import { PriceBet } from '../src/contracts/priceBet'
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

// All data was pre-fetched from the WitnessOnChain oracle service.
// See https://witnessonchain.com/

const RESP_0 = {
    digest: 'fa922e641c9d050000000000044253565f555344430000000000000000',
    rate: 36.79,
    signatures: {
        rabin: {
            padding: '',
            public_key:
                'ad7e1e8d6d2960129c9fe6b636ef4041037f599c807ecd5adf491ce45835344b18fd4e7c92fd63bb822b221344fe21c0522ab81e9f8e848206875370cae4d908ac2656192ad6910ebb685036573b442ec1cff490c1638b7f5a181ae6d6bc9a04a305720559c893611f836321c2beb69dbf3694b9305a988c77e0a451c38674e84ce95a912833d2cf4ca9d48cc76d8250d0130740145ca19e20b1513bb93ca7665c1f110493d1b5aa344702109df5feca790f988eaa02f92e019721ae0e8bfaa9fdcd3401ffb4433fbe6e575ed9f704a6dc60872f0d23b2f43bfe5e64ce0fbc71283e6dedee79e20ad878917fa4a8257f879527c58f89a8670be591fc2815f7e7a8d74a9830788404f66170058dd7a08f47c4954324088dbed2f330015ccc36d29efd392a3cd5bf9835871f6b4b203c228af16f5b461676ce8e51003afd3137978117cf41147f2bb615a7c338bebdca5f81a43fe9b51480ae52ce04cf2f2b1714599fe09ae8401e0e155b4caa89fb37b00c604517fc36961f84901a73a343bb40',
            signature:
                '3d90715373a2564bc76ecfd8d4bf1a15411713f39b2f21fa301de763974d0844f64b6724eceb6d2622058e8d730690a4bdaca3f5823c1586eea1c533a6edbbf97d04fd03cb3cbfccc7698deaa8a20c33e5e6f22081c50046cb18abb0c3418b6c228fdaa68e96ddffc9594642274378119d60713e80ae65340c4e8374c45dc3ac821ef5241b3f28668ba6907471ef7f1433c5dfe7d0e48a2fbc64dee09a80492126847e80fe90b0efaa8adf90a2960d475c53c3781897f0328ca4237b317e4c25f055ef5d7a2f68388341f88222e100621184e3b6a06c6801582c8d20a2b4e29546409a6b8b059c5d523f4c993219dfb45fca3ad640fb88ba569ce487f428727c53f34d7a5c5b51dbda97933db53f5ca01a76a1f749ce869ff48da17bb1afaa03775879b956b5b1bc3e6a0b47ef75ab1ec9398df0e21d6946b01fa97c708ea724437a7dde06bbe87137c068e77bfb1e91bb332161e525b2079bc64853685f5cb5a5449aa51d84fcae1722c49f3222ddaca2441c4b21c1d72bf7ad81ca4df71f3e',
        },
    },
    symbol: 'BSV_USDC',
    timestamp: 1680773882,
}

describe('Test SmartContract `PriceBet`', () => {
    const rabinPubKey: bigint = byteString2Int(
        RESP_0.signatures.rabin.public_key + '00'
    )

    let alicePrivKey: bsv.PrivateKey
    let bobPrivKey: bsv.PrivateKey

    let priceBet: PriceBet

    before(() => {
        // Prepare inital data.
        alicePrivKey = bsv.PrivateKey.fromRandom(bsv.Networks.testnet)
        bobPrivKey = bsv.PrivateKey.fromRandom(bsv.Networks.testnet)

        const decimal = 4
        const targetPriceFloat = 36.3 // USDT
        const targetPrice = Math.round(targetPriceFloat * 10 ** decimal)
        const timestampFrom = 1680652800n // Thu, 05 Apr 2023 00:00:00 GMT
        const timestampTo = 1680998400n // Thu, 09 Apr 2023 00:00:00 GMT 🥚
        const symbol = toByteString(RESP_0.symbol, true) + '0000000000000000'

        PriceBet.loadArtifact()
        priceBet = new PriceBet(
            BigInt(targetPrice),
            symbol,
            timestampFrom,
            timestampTo,
            rabinPubKey as RabinPubKey,
            PubKey(alicePrivKey.publicKey.toByteString()),
            PubKey(bobPrivKey.publicKey.toByteString())
        )
    })

    it('should pass w correct sig and data.', async () => {
        // Pick winner.
        const decimal = 4
        const currentPrice = Math.round(RESP_0.rate * 10 ** decimal)
        let winner = alicePrivKey
        if (currentPrice < priceBet.targetPrice) {
            winner = bobPrivKey
        }
        const winnerPubKey = winner.publicKey

        // Connect signer.
        await priceBet.connect(getDefaultSigner(winner))
        await priceBet.deploy(1)

        const oracleSigS = byteString2Int(
            RESP_0.signatures.rabin.signature + '00'
        )
        const oracleSigPadding: ByteString = RESP_0.signatures.rabin.padding
        const oracleSig: RabinSig = {
            s: oracleSigS,
            padding: oracleSigPadding,
        }

        const callContract = async () =>
            priceBet.methods.unlock(
                RESP_0.digest as ByteString,
                oracleSig,
                (sigResps) => findSig(sigResps, winnerPubKey),
                // Method call options:
                {
                    pubKeyOrAddrToSign: winnerPubKey,
                } as MethodCallOptions<PriceBet>
            )
        return expect(callContract()).not.rejected
    })

    it('should fail paying wrong player.', async () => {
        // Pick winner.
        const decimal = 4
        const currentPrice = Math.round(RESP_0.rate * 10 ** decimal)
        let looser = alicePrivKey
        if (currentPrice >= priceBet.targetPrice) {
            looser = bobPrivKey
        }
        const looserPubKey = looser.publicKey

        // Connect signer.
        await priceBet.connect(getDefaultSigner(looser))
        await priceBet.deploy(1)

        const oracleSigS = byteString2Int(
            RESP_0.signatures.rabin.signature + '00'
        )
        const oracleSigPadding: ByteString = RESP_0.signatures.rabin.padding
        const oracleSig: RabinSig = {
            s: oracleSigS,
            padding: oracleSigPadding,
        }

        const callContract = async () =>
            priceBet.methods.unlock(
                RESP_0.digest as ByteString,
                oracleSig,
                (sigResps) => findSig(sigResps, looserPubKey),
                // Method call options:
                {
                    pubKeyOrAddrToSign: looserPubKey,
                } as MethodCallOptions<PriceBet>
            )

        return expect(callContract()).to.be.rejectedWith(
            /signature check failed/
        )
    })
})
