import { expect, use } from 'chai'
import chaiAsPromised from 'chai-as-promised'
import {
    findSig,
    getDummySig,
    MethodCallOptions,
    PubKey,
    toHex,
} from 'scrypt-ts'
import { Recallable } from '../src/contracts/recallable'
import { getDefaultSigner, randomPrivateKey } from './utils/helper'

use(chaiAsPromised)

describe('Test SmartContract `Recallable`', () => {
    // alice is the issuer
    const [alicePrivateKey, alicePublicKey] = randomPrivateKey()
    // bob is a user
    const [, bobPublicKey] = randomPrivateKey()

    let recallable: Recallable

    before(async () => {
        Recallable.loadArtifact()

        recallable = new Recallable(PubKey(alicePublicKey.toByteString()))
        await recallable.connect(getDefaultSigner(alicePrivateKey))

        await recallable.deploy(100)
    })

    it('should fail with `satoshisSent` that is less than 1', () => {
        const callContract = async () =>
            await recallable.methods.transfer(
                (sigResps) => findSig(sigResps, alicePublicKey),
                PubKey(bobPublicKey.toByteString()),
                BigInt(0), // less than 1
                {
                    pubKeyOrAddrToSign: alicePublicKey,
                } as MethodCallOptions<Recallable>
            )
        return expect(callContract()).to.be.rejectedWith(
            /invalid value of `satoshisSent`/
        )
    })

    it('should fail with `satoshisSent` that is greater than total satoshis', () => {
        const callContract = async () =>
            await recallable.methods.transfer(
                (sigResps) => findSig(sigResps, alicePublicKey),
                PubKey(bobPublicKey.toByteString()),
                BigInt(recallable.balance + 1), // more than the total satoshis
                {
                    pubKeyOrAddrToSign: alicePublicKey,
                } as MethodCallOptions<Recallable>
            )

        return expect(callContract()).to.be.rejectedWith(
            /invalid value of `satoshisSent`/
        )
    })

    it('should fail with invalid signature', () => {
        const callContract = async () =>
            await recallable.methods.transfer(
                () => getDummySig(),
                PubKey(bobPublicKey.toByteString()),
                BigInt(1)
            )
        return expect(callContract()).to.be.rejectedWith(
            /user's signature check failed/
        )
    })

    it('should pass 3000/7000 and recall', async () => {
        /**
         * alice transfers 3000 to bob, keeps 7000 left
         * */

        const aliceNextInstance = recallable.next()

        const bobNextInstance = recallable.next()
        bobNextInstance.userPubKey = PubKey(bobPublicKey.toByteString())

        const satoshiSent = 50
        const satoshisLeft = recallable.balance - satoshiSent

        // transfer method calling tx
        const callTransfer = async () =>
            await recallable.methods.transfer(
                (sigResps) => findSig(sigResps, alicePublicKey),
                PubKey(bobPublicKey.toByteString()),
                BigInt(satoshiSent),
                {
                    pubKeyOrAddrToSign: alicePublicKey,
                    next: [
                        {
                            instance: bobNextInstance,
                            balance: satoshiSent,
                        },
                        {
                            instance: aliceNextInstance,
                            balance: satoshisLeft,
                        },
                    ],
                } as MethodCallOptions<Recallable>
            )
        expect(callTransfer()).not.throw

        recallable = aliceNextInstance
        /**
         * alice recall 3000 from bob
         */

        const aliceRecallInstance = bobNextInstance.next()
        aliceRecallInstance.userPubKey = PubKey(alicePublicKey.toByteString())

        // recall method calling tx
        const callRecall = async () =>
            await bobNextInstance.methods.recall(
                (sigResps) => findSig(sigResps, alicePublicKey),
                {
                    pubKeyOrAddrToSign: alicePublicKey,
                    next: {
                        instance: aliceRecallInstance,
                        balance: bobNextInstance.balance,
                    },
                } as MethodCallOptions<Recallable>
            )
        expect(callRecall()).not.throw
    })

    it('should pass 10000/0', async () => {
        // alice transfers 10000 to bob, keeps nothing left

        const bobNextInstance = recallable.next()
        bobNextInstance.userPubKey = PubKey(bobPublicKey.toByteString())

        const satoshiSent = recallable.balance

        // transfer method calling tx
        expect(
            await recallable.methods.transfer(
                (sigResps) => findSig(sigResps, alicePublicKey),
                PubKey(bobPublicKey.toByteString()),
                BigInt(satoshiSent),
                {
                    pubKeyOrAddrToSign: alicePublicKey,
                    next: {
                        instance: bobNextInstance,
                        balance: satoshiSent,
                        atOutputIndex: 0,
                    },
                } as MethodCallOptions<Recallable>
            )
        ).not.throw
    })
})
