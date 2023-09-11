import { expect, use } from 'chai'
import { Erc721 } from '../src/contracts/erc721'
import { myPublicKey } from './utils/privateKey'
import {
    findSig,
    getDummySig,
    HashedMap,
    MethodCallOptions,
    PubKey,
    toHex,
} from 'scrypt-ts'
import chaiAsPromised from 'chai-as-promised'
import { getDefaultSigner, randomPrivateKey } from './utils/helper'

use(chaiAsPromised)
describe('Test SmartContract `Erc721`', () => {
    before(() => {
        Erc721.loadArtifact()
    })

    it('should fail `mint` without correct minter sig', async () => {
        const owners: HashedMap<bigint, PubKey> = new HashedMap<
            bigint,
            PubKey
        >()
        const erc721 = new Erc721(PubKey(myPublicKey.toByteString()), owners)
        await erc721.connect(getDefaultSigner())
        await erc721.deploy(1)

        const [, alicePubKey] = randomPrivateKey()
        const callContract = async () =>
            await erc721.methods.mint(
                1n, // tokenId
                PubKey(alicePubKey.toByteString()), // mintTo
                () => getDummySig() // mint without correct minter sig
            )

        return expect(callContract()).to.be.rejectedWith(
            /minter signature check failed/
        )
    })

    it('should fail `mint` when token was already minted before', async () => {
        const [, alicePubKey] = randomPrivateKey()
        const tokenId = 1n

        const owners: HashedMap<bigint, PubKey> = new HashedMap<
            bigint,
            PubKey
        >()
        owners.set(tokenId, PubKey(alicePubKey.toByteString())) // token has already in the owners map

        const erc721 = new Erc721(PubKey(myPublicKey.toByteString()), owners)
        await erc721.connect(getDefaultSigner())
        await erc721.deploy(1)
        const callContract = async () =>
            await erc721.methods.mint(
                tokenId, // token already minted before
                PubKey(alicePubKey.toByteString()), // mintTo
                (sigResps) => findSig(sigResps, myPublicKey) // minterSig
            )

        return expect(callContract()).to.be.rejectedWith(
            /token was already minted before/
        )
    })

    it("should fail `burn` when the sender doesn't have the token", async () => {
        const [, alicePubKey] = randomPrivateKey()
        const [bobPrivateKey, bobPublicKey] = randomPrivateKey()
        const tokenId = 1n

        const owners: HashedMap<bigint, PubKey> = new HashedMap<
            bigint,
            PubKey
        >()
        owners.set(tokenId, PubKey(alicePubKey.toByteString())) // alice has the token

        const erc721 = new Erc721(PubKey(myPublicKey.toByteString()), owners)
        await erc721.connect(getDefaultSigner(bobPrivateKey))
        await erc721.deploy(1)
        // bob burn the token will fail

        const callContract = async () =>
            await erc721.methods.burn(
                tokenId,
                PubKey(bobPublicKey.toByteString()),
                (sigResps) => findSig(sigResps, bobPublicKey),
                {
                    pubKeyOrAddrToSign: bobPublicKey,
                } as MethodCallOptions<Erc721>
            )

        return expect(callContract()).to.be.rejectedWith(
            /sender doesn't have the token/
        )
    })

    it('should pass `mint`, `transferFrom` then `burn`', async () => {
        const [alicePrivateKey, alicePubKey] = randomPrivateKey()
        const [bobPrivateKey, bobPubKey] = randomPrivateKey()
        const tokenId = 1n

        const owners: HashedMap<bigint, PubKey> = new HashedMap<
            bigint,
            PubKey
        >()

        const erc721 = new Erc721(PubKey(myPublicKey.toByteString()), owners)
        await erc721.connect(getDefaultSigner([alicePrivateKey, bobPrivateKey]))

        await erc721.deploy(1)

        // mint to alice

        const aliceInstance = erc721.next()
        aliceInstance.owners.set(tokenId, PubKey(alicePubKey.toByteString()))
        const callMint = async () =>
            await erc721.methods.mint(
                tokenId, // tokenId
                PubKey(alicePubKey.toByteString()), // mintTo
                (sigResps) => findSig(sigResps, myPublicKey), // minterSig
                {
                    pubKeyOrAddrToSign: myPublicKey,
                    next: {
                        instance: aliceInstance,
                        balance: erc721.balance,
                        atOutputIndex: 0,
                    },
                } as MethodCallOptions<Erc721>
            )

        expect(callMint()).not.throw

        // transfer from alice to bob

        const bobInstance = aliceInstance.next()
        bobInstance.owners.set(tokenId, PubKey(bobPubKey.toByteString()))

        const callTransferFrom = async () =>
            await aliceInstance.methods.transferFrom(
                1n, // tokenId
                PubKey(alicePubKey.toByteString()), // sender
                (sigResps) => findSig(sigResps, alicePubKey), // sig
                PubKey(bobPubKey.toByteString()), // receiver
                {
                    pubKeyOrAddrToSign: alicePubKey,
                    next: {
                        instance: bobInstance,
                        balance: aliceInstance.balance,
                        atOutputIndex: 0,
                    },
                } as MethodCallOptions<Erc721>
            )

        expect(callTransferFrom()).not.throw

        // bob burn
        const burnInstance = bobInstance.next()
        burnInstance.owners.delete(tokenId)

        const callBurn = async () =>
            await bobInstance.methods.burn(
                tokenId, // tokenId
                PubKey(bobPubKey.toByteString()), // sender
                (sigResps) => findSig(sigResps, bobPubKey), // sig
                {
                    pubKeyOrAddrToSign: bobPubKey,
                    next: {
                        instance: burnInstance,
                        balance: bobInstance.balance,
                        atOutputIndex: 0,
                    },
                } as MethodCallOptions<Erc721>
            )
        expect(callBurn()).not.throw
    })
})
