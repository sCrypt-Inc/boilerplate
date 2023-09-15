import { expect, use } from 'chai'
import {
    MethodCallOptions,
    PubKey,
    toHex,
    HashedMap,
    findSig,
    bsv,
    ContractId,
} from 'scrypt-ts'
import { CrowdfundReplay } from '../src/contracts/crowdfundReplay'
import { getDefaultSigner, randomPrivateKey } from './utils/helper'
import chaiAsPromised from 'chai-as-promised'
import { myPublicKey } from './utils/privateKey'
import { getTransaction, replayToLatest } from './utils/replayHelper'
use(chaiAsPromised)

if (process.env.NETWORK === 'testnet') {
    describe('Test SmartContract `Crowdfund`', () => {
        const deadline = 1000
        let contractId: ContractId

        before(async () => {
            await CrowdfundReplay.compile()

            const [privateKey1, publicKey1, ,] = randomPrivateKey()
            const [privateKey2, publicKey2, ,] = randomPrivateKey()
            const [privateKey3, publicKey3, ,] = randomPrivateKey()

            const instance = new CrowdfundReplay(
                PubKey(toHex(myPublicKey)),
                new HashedMap<PubKey, bigint>(),
                BigInt(deadline),
                10n
            )
            await instance.connect(
                getDefaultSigner([privateKey1, privateKey2, privateKey3])
            )

            const deployTx = await instance.deploy()
            contractId = {
                txId: deployTx.id,
                outputIndex: 0,
            }

            // alice donates 3 sats
            const instance1 = await donate(instance, publicKey1, 3n)
            // bob donates 5 sats
            const instance2 = await donate(instance1, publicKey2, 5n)
            // alice refunds 3 sats
            const instance3 = await refund(instance2, publicKey1, 3n)
            // charles donates 7 sats
            await donate(instance3, publicKey3, 7n)
        })

        async function donate(
            instance: CrowdfundReplay,
            donator: bsv.PublicKey,
            amount: bigint
        ) {
            const pubKey = PubKey(toHex(donator))
            const nextInstance = instance.next()
            nextInstance.donators.set(pubKey, amount)
            const { next } = await instance.methods.donate(pubKey, amount, {
                next: {
                    instance: nextInstance,
                    balance: instance.balance + Number(amount),
                },
            } as MethodCallOptions<CrowdfundReplay>)
            return next!.instance
        }

        async function refund(
            instance: CrowdfundReplay,
            donator: bsv.PublicKey,
            amount: bigint
        ) {
            const pubKey = PubKey(toHex(donator))
            const nextInstance = instance.next()
            nextInstance.donators.delete(pubKey)
            const { next } = await instance.methods.refund(
                pubKey,
                amount,
                (sigResps) => findSig(sigResps, donator),
                {
                    pubKeyOrAddrToSign: donator,
                    next: {
                        instance: nextInstance,
                        balance: instance.balance - Number(amount),
                    },
                } as MethodCallOptions<CrowdfundReplay>
            )
            return next!.instance
        }

        it('should pass', async () => {
            // recover instance from deploy transaction
            const tx = await getTransaction(contractId.txId)
            const instance = CrowdfundReplay.fromTx(
                tx,
                contractId.outputIndex,
                {
                    donators: new HashedMap<PubKey, bigint>(),
                }
            )

            // replay to get latest instance
            const latestInstance = await replayToLatest(instance, contractId)

            if (latestInstance) {
                // the latest instance is ready to use here
                await latestInstance.connect(getDefaultSigner())

                const call = async () =>
                    latestInstance.methods.collect(
                        (sigResps) => findSig(sigResps, myPublicKey),
                        {
                            lockTime: deadline,
                            pubKeyOrAddrToSign: myPublicKey,
                        } as MethodCallOptions<CrowdfundReplay>
                    )
                await expect(call()).not.to.be.rejected
            }
        })
    })
}
