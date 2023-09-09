import { expect, use } from 'chai'
import {
    findSig,
    MethodCallOptions,
    PubKey,
    toHex,
    bsv,
    HashedMap,
} from 'scrypt-ts'
import { Crowdfund2 } from '../src/contracts/crowdfunding'
import { DonorMap } from '../src/contracts/crowdfunding'
import { getDefaultSigner, randomPrivateKey } from './utils/helper'
import chaiAsPromised from 'chai-as-promised'
use(chaiAsPromised)

const [privateKeyRecipient, publicKeyRecipient, ,] = randomPrivateKey()
const [privateKeyContributor, publicKeyContributor, ,] = randomPrivateKey()

describe('Test SmartContract `Crowdfund`', () => {
    // JS timestamps are in milliseconds, so we divide by 1000 to get a UNIX timestamp
    const deadline = Math.round(new Date('2023-11-01').valueOf() / 1000)
    const target = 2n

    let instance: Crowdfund2
    let map: DonorMap

    before(async () => {
        await Crowdfund2.compile()

        map = new HashedMap<PubKey, bigint>()
        instance = new Crowdfund2(
            PubKey(toHex(publicKeyRecipient)),
            map,
            0n,
            0n,
            BigInt(deadline),
            target
        )
        await instance.connect(
            getDefaultSigner([privateKeyRecipient, privateKeyContributor])
        )
    })

    it('should Donate fund success', async () => {
        await instance.deploy(10)

        const nextInstance = instance.next()

        const call = async () => {
            await instance.methods.donate(
                PubKey(toHex(publicKeyContributor)),
                2n,
                {
                    lockTime: deadline,
                    next: {
                        instance: nextInstance,
                        balance: instance.balance,
                    },
                } as MethodCallOptions<Crowdfund2>
            )

            return expect(call()).not.be.rejected
        }
    })

    it('should collect fund success', async () => {
        await instance.deploy(10)

        const nextInstance = instance.next()
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
                } as MethodCallOptions<Crowdfund2>
            )
            return expect(call()).not.be.rejected
        }
    })

    it('should refund fund success', async () => {
        await instance.deploy(10)

        const nextInstance = instance.next()

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
                } as MethodCallOptions<Crowdfund2>
            )
            return expect(call()).not.be.rejected
        }
    })
})
