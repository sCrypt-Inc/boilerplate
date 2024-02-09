import { expect, use } from 'chai'
import {
    MethodCallOptions,
    PubKey,
    toHex,
    HashedMap,
    findSig,
    bsv,
    ContractId,
    DefaultProvider,
    TestWallet,
} from 'scrypt-ts'
import { CrowdfundReplay } from '../src/contracts/crowdfundReplay'
import { getDefaultSigner, randomPrivateKey } from './utils/helper'
import chaiAsPromised from 'chai-as-promised'
import { myAddress, myPrivateKey, myPublicKey } from './utils/privateKey'
import { getTransaction, replayToLatest } from './utils/replayHelper'
use(chaiAsPromised)

if (process.env.NETWORK === 'testnet') {
    // only applicable when running testnet test
    // since we need to retrieve raw transactions and construct the spent chain from the network

    describe('Test SmartContract `CrowdfundReplay`', () => {
        const deadline = 1000
        let contractId: ContractId

        before(async () => {
            await CrowdfundReplay.loadArtifact()

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
            console.log('Deployment:', deployTx.id)

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
            nextInstance.applyOffchainUpdatesForDonate(pubKey, amount)
            const callRes = await instance.methods.donate(pubKey, amount, {
                next: {
                    instance: nextInstance,
                    balance: instance.balance + Number(amount),
                },
            } as MethodCallOptions<CrowdfundReplay>)
            console.log('Donate:', callRes.tx.id)
            return nextInstance
        }

        async function refund(
            instance: CrowdfundReplay,
            donator: bsv.PublicKey,
            amount: bigint
        ) {
            const pubKey = PubKey(toHex(donator))
            const callRes = await instance.methods.refund(
                pubKey,
                amount,
                (sigResps) => findSig(sigResps, donator),
                {
                    pubKeyOrAddrToSign: donator,
                } as MethodCallOptions<CrowdfundReplay>
            )
            console.log('Refund:', callRes.tx.id)
            return callRes.next!.instance
        }

        async function collect(instance: CrowdfundReplay) {
            const callRes = await instance.methods.collect(
                (sigResps) => findSig(sigResps, myPublicKey),
                {
                    lockTime: deadline,
                    pubKeyOrAddrToSign: myPublicKey,
                } as MethodCallOptions<CrowdfundReplay>
            )
            console.log('Collect:', callRes.tx.id)
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

                const [, publicKey4, ,] = randomPrivateKey()
                const nextInstance = await donate(
                    latestInstance,
                    publicKey4,
                    9n
                )

                const call = async () => await collect(nextInstance)
                await expect(call()).not.to.be.rejected
            }
        })
    })
}
