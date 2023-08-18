import { expect, use } from 'chai'
import { findSig, MethodCallOptions, PubKey, toHex, bsv } from 'scrypt-ts'
import { Crowdfund } from '../src/contracts/crowdfund'
import { getDefaultSigner, randomPrivateKey } from './utils/helper'
import chaiAsPromised from 'chai-as-promised'
use(chaiAsPromised)

const [privateKeyRecipient, publicKeyRecipient, ,] = randomPrivateKey()
const [privateKeyContributor, publicKeyContributor, ,] = randomPrivateKey()

describe('Test SmartContract `Crowdfund`', () => {
    // JS timestamps are in milliseconds, so we divide by 1000 to get a UNIX timestamp
    const deadline = Math.round(new Date('2020-01-03').valueOf() / 1000)
    const target = BigInt(1)

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
            getDefaultSigner([privateKeyRecipient, privateKeyContributor])
        )
    })

    it('should collect fund success', async () => {
        const deployTx = await crowdfund.deploy(2)
        console.log('Crowdfund contract deployed: ', deployTx.id)

        const { tx: callTx, atInputIndex } = await crowdfund.methods.collect(
            (sigResps) => findSig(sigResps, publicKeyRecipient),
            {
                pubKeyOrAddrToSign: publicKeyRecipient,
                changeAddress: publicKeyRecipient.toAddress(
                    bsv.Networks.testnet
                ),
            } as MethodCallOptions<Crowdfund>
        )
        console.log('Crowdfund contract called: ', callTx.id)
        const result = callTx.verifyScript(atInputIndex)
        expect(result.success, result.error).to.eq(true)
    })

    it('should success when refund', async () => {
        const deployTx = await crowdfund.deploy(1)
        console.log('Crowdfund contract deployed: ', deployTx.id)
        const today = Math.round(new Date().valueOf() / 1000)
        const { tx: callTx, atInputIndex } = await crowdfund.methods.refund(
            (sigResps) => findSig(sigResps, publicKeyContributor),
            {
                pubKeyOrAddrToSign: publicKeyContributor,
                lockTime: today,
            } as MethodCallOptions<Crowdfund>
        )
        console.log('Crowdfund contract called: ', callTx.id)
        const result = callTx.verifyScript(atInputIndex)
        expect(result.success, result.error).to.eq(true)
    })

    it('should fail when refund before deadline', async () => {
        const deployTx = await crowdfund.deploy(1)
        console.log('Crowdfund contract deployed: ', deployTx.id)
        return expect(
            crowdfund.methods.refund(
                (sigResps) => findSig(sigResps, publicKeyContributor),
                {
                    pubKeyOrAddrToSign: publicKeyContributor,
                    lockTime: deadline - 1,
                } as MethodCallOptions<Crowdfund>
            )
        ).to.be.rejectedWith(/fundraising expired/)
    })
})
