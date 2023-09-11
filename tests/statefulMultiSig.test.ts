import { expect, use } from 'chai'
import chaiAsPromised from 'chai-as-promised'
use(chaiAsPromised)

import { Owner, StatefulMultiSig } from '../src/contracts/statefulMultiSig'
import { getDefaultSigner } from './utils/helper'
import {
    bsv,
    FixedArray,
    MethodCallOptions,
    PubKey,
    findSig,
    Addr,
} from 'scrypt-ts'
import { myAddress } from './utils/privateKey'

describe('Test SmartContract `StatefulMultiSig`', () => {
    const destAddr = Addr(myAddress.toByteString())

    const privKeys: bsv.PrivateKey[] = []
    const pubKeys: bsv.PublicKey[] = []
    let owners: FixedArray<Owner, typeof StatefulMultiSig.M>

    before(() => {
        const _owners: Array<Owner> = []
        for (let i = 0; i < StatefulMultiSig.M; i++) {
            const privKey = bsv.PrivateKey.fromRandom(bsv.Networks.testnet)
            const pubKey = privKey.toPublicKey()
            privKeys.push(privKey)
            pubKeys.push(pubKey)
            _owners.push({
                pubKey: PubKey(pubKey.toByteString()),
                validated: false,
            })
        }

        owners = _owners as FixedArray<Owner, typeof StatefulMultiSig.M>
        StatefulMultiSig.loadArtifact()
    })

    it('should pass adding valid sig.', async () => {
        const statefulMultiSig = new StatefulMultiSig(destAddr, owners)

        const pubKeyIdx = 0

        const signer = getDefaultSigner(privKeys[pubKeyIdx])
        await statefulMultiSig.connect(signer)

        await statefulMultiSig.deploy(1)

        // Construct next contract instance and update flag array.
        const next = statefulMultiSig.next()
        next.owners[pubKeyIdx].validated = true

        const callContract = async () =>
            statefulMultiSig.methods.add(
                (sigResps) => findSig(sigResps, pubKeys[pubKeyIdx]),
                BigInt(pubKeyIdx),
                // Method call options:
                {
                    pubKeyOrAddrToSign: pubKeys[pubKeyIdx],
                    next: {
                        instance: next,
                        balance: statefulMultiSig.balance,
                    },
                } as MethodCallOptions<StatefulMultiSig>
            )
        return expect(callContract()).not.rejected
    })

    it('should pass paying out if threshold reached.', async () => {
        let statefulMultiSig = new StatefulMultiSig(destAddr, owners)
        await statefulMultiSig.connect(getDefaultSigner())
        await statefulMultiSig.deploy(1)

        for (let i = 0; i < StatefulMultiSig.N; i++) {
            const pubKeyIdx = i

            const signer = getDefaultSigner(privKeys[pubKeyIdx])
            await statefulMultiSig.connect(signer)

            // Construct next contract instance and update flag array.
            const next = statefulMultiSig.next()
            next.owners[pubKeyIdx].validated = true

            const callContract = async () =>
                statefulMultiSig.methods.add(
                    (sigResps) => findSig(sigResps, pubKeys[pubKeyIdx]),
                    BigInt(pubKeyIdx),
                    // Method call options:
                    {
                        pubKeyOrAddrToSign: pubKeys[pubKeyIdx],
                        next: {
                            instance: next,
                            balance: statefulMultiSig.balance,
                        },
                    } as MethodCallOptions<StatefulMultiSig>
                )
            await expect(callContract()).not.rejected

            statefulMultiSig = next
        }

        const callContract = async () =>
            statefulMultiSig.methods.pay(
                // Method call options:
                {
                    changeAddress:
                        await statefulMultiSig.signer.getDefaultAddress(),
                } as MethodCallOptions<StatefulMultiSig>
            )
        return expect(callContract()).not.rejected
    })

    it('should fail adding invalid sig.', async () => {
        const statefulMultiSig = new StatefulMultiSig(destAddr, owners)

        const pubKeyIdx = 0

        const randKey = bsv.PrivateKey.fromRandom(bsv.Networks.testnet)
        const signer = getDefaultSigner(randKey)
        await statefulMultiSig.connect(signer)
        await statefulMultiSig.deploy(1)

        // Construct next contract instance and update flag array.
        const next = statefulMultiSig.next()
        next.owners[pubKeyIdx].validated = true

        const callContract = async () =>
            statefulMultiSig.methods.add(
                (sigResps) => findSig(sigResps, randKey.publicKey),
                BigInt(pubKeyIdx),
                // Method call options:
                {
                    pubKeyOrAddrToSign: randKey.publicKey,
                    next: {
                        instance: next,
                        balance: statefulMultiSig.balance,
                    },
                } as MethodCallOptions<StatefulMultiSig>
            )
        return expect(callContract()).to.be.rejectedWith(
            /signature check failed/
        )
    })

    it('should fail pay if threshold not reached', async () => {
        const statefulMultiSig = new StatefulMultiSig(destAddr, owners)

        const signer = getDefaultSigner()
        await statefulMultiSig.connect(signer)
        await statefulMultiSig.deploy(1)

        const callContract = async () =>
            statefulMultiSig.methods.pay(
                // Method call options:
                {
                    changeAddress:
                        await statefulMultiSig.signer.getDefaultAddress(),
                } as MethodCallOptions<StatefulMultiSig>
            )
        return expect(callContract()).to.be.rejectedWith(
            /Not enough valid signatures./
        )
    })
})
