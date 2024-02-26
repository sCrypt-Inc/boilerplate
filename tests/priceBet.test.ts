import { PriceBet } from '../src/contracts/priceBet'
import {
    bsv,
    PubKey,
    toByteString,
    MethodCallOptions,
    findSig,
    ByteString,
} from 'scrypt-ts'
import { RabinPubKey, RabinSig, WitnessOnChainVerifier } from 'scrypt-ts-lib'
import { expect, use } from 'chai'
import { getDefaultSigner } from './utils/helper'
import chaiAsPromised from 'chai-as-promised'
use(chaiAsPromised)

// All data was pre-fetched from https://api.witnessonchain.com/

// https://api.witnessonchain.com/#/info/AppController_getInfo
const PUBKEY = {
    publicKey:
        'ad7e1e8d6d2960129c9fe6b636ef4041037f599c807ecd5adf491ce45835344b18fd4e7c92fd63bb822b221344fe21c0522ab81e9f8e848206875370cae4d908ac2656192ad6910ebb685036573b442ec1cff490c1638b7f5a181ae6d6bc9a04a305720559c893611f836321c2beb69dbf3694b9305a988c77e0a451c38674e84ce95a912833d2cf4ca9d48cc76d8250d0130740145ca19e20b1513bb93ca7665c1f110493d1b5aa344702109df5feca790f988eaa02f92e019721ae0e8bfaa9fdcd3401ffb4433fbe6e575ed9f704a6dc60872f0d23b2f43bfe5e64ce0fbc71283e6dedee79e20ad878917fa4a8257f879527c58f89a8670be591fc2815f7e7a8d74a9830788404f66170058dd7a08f47c4954324088dbed2f330015ccc36d29efd392a3cd5bf9835871f6b4b203c228af16f5b461676ce8e51003afd3137978117cf41147f2bb615a7c338bebdca5f81a43fe9b51480ae52ce04cf2f2b1714599fe09ae8401e0e155b4caa89fb37b00c604517fc36961f84901a73a343bb40',
}
// https://api.witnessonchain.com/#/v1/V1Controller_getPrice
const RESP = {
    timestamp: 1708923144,
    tradingPair: 'BSV-USDC',
    price: 748600,
    decimal: 4,
    data: '020819dc65386c0b0000000000044253562d55534443',
    signature: {
        s: 'e66925a8225eeba1c44cc670dc01bbcaeeb51d09f3945c8d15fcabde01856824db813b862a67c9dc00242bddfe2fcb402ccdfa97ebaeac45ca279932f143b3ae4c00d49aea6aff5f737cfb642662055ddffaf9f8f399d160516fb8e735039baa6f38b0de5acc88d01706bd4135bea8da2bb61257bfb71a0d551622d38693b9126837d28d7c36dd26e358ac24a7feb7edfc965ef9a761a96e801128f34e07a5a00aa2a5dc2905ed0067330ba41c7708d19e1892ff6d66fad004037b327206f152427b50137d03b4436fcfe51cf75fd216c2ed3831f315bc3b71874a0330d5aa9719a7dca4c6028fa3a26826a25c71951c6ed4d9c27cd4e59f88f4c609e4dc9cdce793b72a92f6a0673dd533856db80091ca68889f0ead8c4916c9b1d672fdeb3f724b98c9d00fda13d6b36d4d6ae7968efd4b74ea6e9eae16b1827d93fc674c4928363cf628f2d30640e979d81a17718281b8c8174d353bd72001f96e13342a5c1c1c03063e1836d8389c2da2c63eb59a71dd8a324730ddb0d6ee99eb20bc2b10',
        padding: '0000',
    },
}

describe('Test SmartContract `PriceBet`', () => {
    let alicePrivKey: bsv.PrivateKey
    let bobPrivKey: bsv.PrivateKey

    let priceBet: PriceBet

    const decimal = 4
    const currentPrice = Math.round(RESP.price * 10 ** decimal)

    before(() => {
        // Prepare inital data.
        alicePrivKey = bsv.PrivateKey.fromRandom(bsv.Networks.testnet)
        bobPrivKey = bsv.PrivateKey.fromRandom(bsv.Networks.testnet)
        const rabinPubKey: RabinPubKey =
            WitnessOnChainVerifier.parsePubKey(PUBKEY)

        const targetPriceFloat = 36.3 // USDC
        const targetPrice = Math.round(targetPriceFloat * 10 ** decimal)
        const timestampFrom = 1708905600n // Mon Feb 26 2024 00:00:00 GMT
        const timestampTo = 1708992000n // Tue Feb 27 2024 00:00:00 GMT
        const tradingPair = toByteString('BSV-USDC', true)

        PriceBet.loadArtifact()
        priceBet = new PriceBet(
            BigInt(targetPrice),
            BigInt(decimal),
            tradingPair,
            timestampFrom,
            timestampTo,
            rabinPubKey,
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

        const oracleMsg: ByteString = WitnessOnChainVerifier.parseMsg(RESP)
        const oracleSig: RabinSig = WitnessOnChainVerifier.parseSig(RESP)

        const callContract = async () =>
            priceBet.methods.unlock(
                oracleMsg,
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
        // Pick loser.
        const loser =
            currentPrice >= priceBet.targetPrice ? bobPrivKey : alicePrivKey
        const loserPubKey = loser.publicKey

        // Connect signer.
        await priceBet.connect(getDefaultSigner(loser))
        await priceBet.deploy(1)

        const oracleMsg: ByteString = WitnessOnChainVerifier.parseMsg(RESP)
        const oracleSig: RabinSig = WitnessOnChainVerifier.parseSig(RESP)

        const callContract = async () =>
            priceBet.methods.unlock(
                oracleMsg,
                oracleSig,
                (sigResps) => findSig(sigResps, loserPubKey),
                // Method call options:
                {
                    pubKeyOrAddrToSign: loserPubKey,
                } as MethodCallOptions<PriceBet>
            )

        return expect(callContract()).to.be.rejectedWith(
            /signature check failed/
        )
    })
})
