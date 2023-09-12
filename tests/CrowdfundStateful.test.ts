import { expect, use } from 'chai'
import {
    findSig,
    MethodCallOptions,
    PubKey,
    toHex,
    bsv,
    HashedMap,
} from 'scrypt-ts'
import {
    CrowdfundStateful,
    DonorMap,
    RefundMap,
} from '../src/contracts/CrowdfundStateful'
import { getDefaultSigner, randomPrivateKey } from './utils/helper'
import chaiAsPromised from 'chai-as-promised'
use(chaiAsPromised)

const [privateKeyRecipient, publicKeyRecipient, ,] = randomPrivateKey()
const [privateKeyContributor, publicKeyContributor, ,] = randomPrivateKey()

describe('Test SmartContract `CrowdfundStateful`', () => {
    // JS timestamps are in milliseconds, so we divide by 1000 to get a UNIX timestamp
    const deadline = Math.round(new Date('2023-11-01').valueOf() / 1000)
    const target = 2n

    let instance: CrowdfundStateful
    let donorMap: DonorMap
    let refundMap: RefundMap

    before(async () => {
        await CrowdfundStateful.compile()

        donorMap = new HashedMap<PubKey, bigint>()
        refundMap = new HashedMap<PubKey, boolean>()
        instance = new CrowdfundStateful(
            PubKey(toHex(publicKeyRecipient)),
            donorMap,
            refundMap,
            BigInt(deadline),
            target
        )
        await instance.connect(
            getDefaultSigner([privateKeyRecipient, privateKeyContributor])
        )
    })

    it('should donate fund success', async () => {
        await instance.deploy(1)

        const donor = PubKey(toHex(publicKeyContributor))
        const donationAmount = 2n

        const nextInstance = instance.next()
        nextInstance.donor.set(donor, donationAmount)
        nextInstance.donorRefunded.set(donor, false)

        const call = async () => {
            await instance.methods.donate(
                PubKey(toHex(publicKeyContributor)),
                donationAmount,
                {
                    changeAddress: publicKeyContributor.toAddress(),
                    lockTime: deadline,
                    next: {
                        instance: nextInstance,
                        balance: instance.balance + Number(donationAmount),
                    },
                } as MethodCallOptions<CrowdfundStateful>
            )
        }

        await expect(call()).not.to.be.rejected
    })

    it('should collect fund success', async () => {
        await instance.deploy(10)

        const nextInstance = instance.next()

        // TODO (Yusuf):
        //    - update property values for next instance
        //    - bind custom tx call builder to add payment outputs

        const call = async () => {
            await instance.methods.collect(
                (sigResps) => findSig(sigResps, publicKeyRecipient),
                {
                    pubKeyOrAddrToSign: publicKeyRecipient,
                    changeAddress: publicKeyRecipient.toAddress(
                        bsv.Networks.testnet
                    ),
                    next: {
                        instance: nextInstance,
                        balance: instance.balance,
                    },
                } as MethodCallOptions<CrowdfundStateful>
            )
        }

        await expect(call()).not.to.be.rejected
    })

    it('should refund fund success', async () => {
        await instance.deploy(10)

        const nextInstance = instance.next()

        // TODO (Yusuf):
        //    - update property values for next instance
        //    - bind custom tx call builder to add payment outputs

        const call = async () => {
            await instance.methods.refund(
                PubKey(toHex(publicKeyContributor)),
                2n,
                (sigResps) => findSig(sigResps, publicKeyContributor),
                {
                    pubKeyOrAddrToSign: publicKeyContributor,
                    changeAddress: publicKeyContributor.toAddress(
                        bsv.Networks.testnet
                    ),
                    next: {
                        instance: nextInstance,
                        balance: instance.balance,
                    },
                } as MethodCallOptions<CrowdfundStateful>
            )
        }

        await expect(call()).not.to.be.rejected
    })
})
