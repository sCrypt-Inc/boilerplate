import { expect, use } from 'chai'
import chaiAsPromised from 'chai-as-promised'
import {
    findSig,
    getDummySig,
    MethodCallOptions,
    PubKey,
    toHex,
} from 'scrypt-ts'
import { Recallable } from '../../src/contracts/recallable'
import { getDummySigner, getDummyUTXO, randomPrivateKey } from '../utils/helper'

use(chaiAsPromised)

describe('Test SmartContract `Recallable`', () => {
    // alice is the issuer
    const [alicePrivateKey, alicePublicKey, ,] = randomPrivateKey()
    // bob is a user
    const [, bobPublicKey, ,] = randomPrivateKey()

    let recallable: Recallable

    before(async () => {
        await Recallable.compile()

        recallable = new Recallable(PubKey(toHex(alicePublicKey)))
        await recallable.connect(getDummySigner(alicePrivateKey))
    })

    it('should fail with `satoshisSent` that is less than 1', () => {
        return expect(
            recallable.methods.transfer(
                (sigResps) => findSig(sigResps, alicePublicKey),
                PubKey(toHex(bobPublicKey)),
                BigInt(0), // less than 1
                {
                    fromUTXO: getDummyUTXO(),
                    pubKeyOrAddrToSign: alicePublicKey,
                } as MethodCallOptions<Recallable>
            )
        ).to.be.rejectedWith(/invalid value of `satoshisSent`/)
    })

    it('should fail with `satoshisSent` that is greater than total satoshis', () => {
        return expect(
            recallable.methods.transfer(
                (sigResps) => findSig(sigResps, alicePublicKey),
                PubKey(toHex(bobPublicKey)),
                BigInt(getDummyUTXO().satoshis + 1), // more than the total satoshis
                {
                    fromUTXO: getDummyUTXO(),
                    pubKeyOrAddrToSign: alicePublicKey,
                } as MethodCallOptions<Recallable>
            )
        ).to.be.rejectedWith(/invalid value of `satoshisSent`/)
    })

    it('should fail with invalid signature', () => {
        return expect(
            recallable.methods.transfer(
                () => getDummySig(),
                PubKey(toHex(bobPublicKey)),
                BigInt(1),
                {
                    fromUTXO: getDummyUTXO(),
                } as MethodCallOptions<Recallable>
            )
        ).to.be.rejectedWith(/user's signature check failed/)
    })

    it('should pass 3000/7000 and recall', async () => {
        /**
         * alice transfers 3000 to bob, keeps 7000 left
         * */

        const aliceNextInstance = recallable.next()

        const bobNextInstance = recallable.next()
        bobNextInstance.userPubKey = PubKey(toHex(bobPublicKey))

        const dummyUTXO = getDummyUTXO()
        const satoshiSent = 3000
        const satoshisLeft = dummyUTXO.satoshis - satoshiSent

        // transfer method calling tx
        const { tx: transferTx, atInputIndex: transferAtInputIndex } =
            await recallable.methods.transfer(
                (sigResps) => findSig(sigResps, alicePublicKey),
                PubKey(toHex(bobPublicKey)),
                BigInt(satoshiSent),
                {
                    fromUTXO: dummyUTXO,
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

        let result = transferTx.verifyScript(transferAtInputIndex)
        expect(result.success, result.error).to.eq(true)

        /**
         * alice recall 3000 from bob
         */

        const aliceRecallInstance = bobNextInstance.next()
        aliceRecallInstance.userPubKey = PubKey(toHex(alicePublicKey))

        // recall method calling tx
        const { tx: recallTx, atInputIndex: recallAtInputIndex } =
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

        result = recallTx.verifyScript(recallAtInputIndex)
        expect(result.success, result.error).to.eq(true)
    })

    it('should pass 10000/0', async () => {
        // alice transfers 10000 to bob, keeps nothing left

        const bobNextInstance = recallable.next()
        bobNextInstance.userPubKey = PubKey(toHex(bobPublicKey))

        const dummyUTXO = getDummyUTXO()
        const satoshiSent = dummyUTXO.satoshis

        // transfer method calling tx
        const { tx: callTx, atInputIndex } = await recallable.methods.transfer(
            (sigResps) => findSig(sigResps, alicePublicKey),
            PubKey(toHex(bobPublicKey)),
            BigInt(satoshiSent),
            {
                fromUTXO: dummyUTXO,
                pubKeyOrAddrToSign: alicePublicKey,
                next: {
                    instance: bobNextInstance,
                    balance: satoshiSent,
                    atOutputIndex: 0,
                },
            } as MethodCallOptions<Recallable>
        )

        const result = callTx.verifyScript(atInputIndex)
        expect(result.success, result.error).to.eq(true)
    })
})
