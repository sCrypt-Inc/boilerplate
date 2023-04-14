import { expect } from 'chai'
import { findSig, MethodCallOptions, PubKey, toHex, bsv } from 'scrypt-ts'
import { Crowdfund } from '../../src/contracts/crowdfund'
import {
    getDummySigner,
    getDummyUTXO,
    inputSatoshis,
    randomPrivateKey,
} from '../utils/helper'

const [privateKeyRecipient, publicKeyRecipient, ,] = randomPrivateKey()
const [privateKeyContributor, publicKeyContributor, ,] = randomPrivateKey()

describe('Test SmartContract `Crowdfund`', () => {
    // JS timestamps are in milliseconds, so we divide by 1000 to get a UNIX timestamp
    const deadline = Math.round(new Date('2020-01-03').valueOf() / 1000)
    const target = BigInt(inputSatoshis - 100)

    let crowdfund: Crowdfund

    before(async () => {
        await Crowdfund.compile()
        crowdfund = new Crowdfund(
            PubKey(toHex(publicKeyRecipient)),
            PubKey(toHex(publicKeyContributor)),
            BigInt(deadline),
            target
        )
        await crowdfund.connect(
            getDummySigner([privateKeyRecipient, privateKeyContributor])
        )
    })

    it('should collect fund success', async () => {
        const { tx: callTx, atInputIndex } = await crowdfund.methods.collect(
            (sigResps) => findSig(sigResps, publicKeyRecipient),
            {
                fromUTXO: getDummyUTXO(),
                pubKeyOrAddrToSign: publicKeyRecipient,
                changeAddress: publicKeyRecipient.toAddress(
                    bsv.Networks.testnet
                ),
            } as MethodCallOptions<Crowdfund>
        )
        const result = callTx.verifyScript(atInputIndex)
        expect(result.success, result.error).to.eq(true)
    })

    it('should success when refund', async () => {
        const today = Math.round(new Date().valueOf() / 1000)
        const { tx: callTx, atInputIndex } = await crowdfund.methods.refund(
            (sigResps) => findSig(sigResps, publicKeyContributor),
            {
                fromUTXO: getDummyUTXO(),
                pubKeyOrAddrToSign: publicKeyContributor,
                lockTime: today,
            } as MethodCallOptions<Crowdfund>
        )
        const result = callTx.verifyScript(atInputIndex)
        expect(result.success, result.error).to.eq(true)
    })

    it('should fail when refund before deadline', async () => {
        return expect(
            crowdfund.methods.refund(
                (sigResps) => findSig(sigResps, publicKeyContributor),
                {
                    fromUTXO: getDummyUTXO(),
                    pubKeyOrAddrToSign: publicKeyContributor,
                    lockTime: deadline - 1,
                } as MethodCallOptions<Crowdfund>
            )
        ).to.be.rejectedWith(/fundraising expired/)
    })
})
