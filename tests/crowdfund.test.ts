import { expect, use } from 'chai'
import { findSig, MethodCallOptions, PubKey, toHex, bsv } from 'scrypt-ts'
import { Crowdfund } from '../src/contracts/crowdfund'
import { getDefaultSigner, randomPrivateKey } from './utils/helper'
import chaiAsPromised from 'chai-as-promised'
use(chaiAsPromised)

const [privateKeyRecipient, publicKeyRecipient] = randomPrivateKey()
const [privateKeyContributor, publicKeyContributor] = randomPrivateKey()

describe('Test SmartContract `Crowdfund`', () => {
    // JS timestamps are in milliseconds, so we divide by 1000 to get a UNIX timestamp
    const deadline = Math.round(new Date('2020-01-03').valueOf() / 1000)
    const target = BigInt(1)

    let crowdfund: Crowdfund

    before(async () => {
        Crowdfund.loadArtifact()
        crowdfund = new Crowdfund(
            PubKey(publicKeyRecipient.toByteString()),
            PubKey(publicKeyContributor.toByteString()),
            BigInt(deadline),
            target
        )
        await crowdfund.connect(
            getDefaultSigner([privateKeyRecipient, privateKeyContributor])
        )
    })

    it('should collect fund success', async () => {
        await crowdfund.deploy(2)
        const callContract = async () =>
            crowdfund.methods.collect(
                (sigResps) => findSig(sigResps, publicKeyRecipient),
                {
                    pubKeyOrAddrToSign: publicKeyRecipient,
                    changeAddress: publicKeyRecipient.toAddress(
                        bsv.Networks.testnet
                    ),
                } as MethodCallOptions<Crowdfund>
            )
        return expect(callContract()).not.rejected
    })

    it('should success when refund', async () => {
        await crowdfund.deploy(1)
        const today = Math.round(new Date().valueOf() / 1000)
        const callContract = async () =>
            crowdfund.methods.refund(
                (sigResps) => findSig(sigResps, publicKeyContributor),
                {
                    pubKeyOrAddrToSign: publicKeyContributor,
                    lockTime: today,
                } as MethodCallOptions<Crowdfund>
            )
        return expect(callContract()).not.rejected
    })

    it('should fail when refund before deadline', async () => {
        await crowdfund.deploy(1)
        const callContract = async () =>
            crowdfund.methods.refund(
                (sigResps) => findSig(sigResps, publicKeyContributor),
                {
                    pubKeyOrAddrToSign: publicKeyContributor,
                    lockTime: deadline - 1,
                } as MethodCallOptions<Crowdfund>
            )

        return expect(callContract()).to.be.rejectedWith(
            /deadline not yet reached/
        )
    })
})
