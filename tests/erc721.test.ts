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
    before(async () => {
        await Erc721.compile()
    })

    it('should fail `mint` without correct minter sig', async () => {
        const owners: HashedMap<bigint, PubKey> = new HashedMap<
            bigint,
            PubKey
        >()
        const erc721 = new Erc721(PubKey(toHex(myPublicKey)), owners)
        await erc721.connect(getDefaultSigner())
        const deployTx = await erc721.deploy(1)
        console.log('Erc721 contract deployed: ', deployTx.id)

        const [, alicePubKey, ,] = randomPrivateKey()

        return expect(
            erc721.methods.mint(
                1n, // tokenId
                PubKey(toHex(alicePubKey)), // mintTo
                () => getDummySig() // mint without correct minter sig
            )
        ).to.be.rejectedWith(/minter signature check failed/)
    })

    it('should fail `mint` when token was already minted before', async () => {
        const [, alicePubKey, ,] = randomPrivateKey()
        const tokenId = 1n

        const owners: HashedMap<bigint, PubKey> = new HashedMap<
            bigint,
            PubKey
        >()
        owners.set(tokenId, PubKey(toHex(alicePubKey))) // token has already in the owners map

        const erc721 = new Erc721(PubKey(toHex(myPublicKey)), owners)
        await erc721.connect(getDefaultSigner())
        const deployTx = await erc721.deploy(1)
        console.log('Erc721 contract deployed: ', deployTx.id)
        return expect(
            erc721.methods.mint(
                tokenId, // token already minted before
                PubKey(toHex(alicePubKey)), // mintTo
                (sigResps) => findSig(sigResps, myPublicKey) // minterSig
            )
        ).to.be.rejectedWith(/token was already minted before/)
    })

    it("should fail `burn` when the sender doesn't have the token", async () => {
        const [, alicePubKey, ,] = randomPrivateKey()
        const [bobPrivateKey, bobPublicKey, ,] = randomPrivateKey()
        const tokenId = 1n

        const owners: HashedMap<bigint, PubKey> = new HashedMap<
            bigint,
            PubKey
        >()
        owners.set(tokenId, PubKey(toHex(alicePubKey))) // alice has the token

        const erc721 = new Erc721(PubKey(toHex(myPublicKey)), owners)
        await erc721.connect(getDefaultSigner(bobPrivateKey))
        const deployTx = await erc721.deploy(1)
        console.log('Erc721 contract deployed: ', deployTx.id)
        // bob burn the token will fail
        return expect(
            erc721.methods.burn(
                tokenId,
                PubKey(toHex(bobPublicKey)),
                (sigResps) => findSig(sigResps, bobPublicKey),
                {
                    pubKeyOrAddrToSign: bobPublicKey,
                } as MethodCallOptions<Erc721>
            )
        ).to.be.rejectedWith(/sender doesn't have the token/)
    })

    it('should pass `mint`, `transferFrom` then `burn`', async () => {
        const [alicePrivateKey, alicePubKey, ,] = randomPrivateKey()
        const [bobPrivateKey, bobPubKey, ,] = randomPrivateKey()
        const tokenId = 1n

        const owners: HashedMap<bigint, PubKey> = new HashedMap<
            bigint,
            PubKey
        >()

        const erc721 = new Erc721(PubKey(toHex(myPublicKey)), owners)
        await erc721.connect(getDefaultSigner([alicePrivateKey, bobPrivateKey]))

        const deployTx = await erc721.deploy(1)
        console.log('Erc721 contract deployed: ', deployTx.id)

        // mint to alice

        const aliceInstance = erc721.next()
        aliceInstance.owners.set(tokenId, PubKey(toHex(alicePubKey)))

        const { tx: mintTx, atInputIndex: mintAtInputIndex } =
            await erc721.methods.mint(
                tokenId, // tokenId
                PubKey(toHex(alicePubKey)), // mintTo
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
        console.log('Erc721 contract called (mint): ', mintTx.id)
        let result = mintTx.verifyScript(mintAtInputIndex)
        expect(result.success, result.error).to.eq(true)

        // transfer from alice to bob

        const bobInstance = aliceInstance.next()
        bobInstance.owners.set(tokenId, PubKey(toHex(bobPubKey)))

        const { tx: transferTx, atInputIndex: transferAtInputIndex } =
            await aliceInstance.methods.transferFrom(
                1n, // tokenId
                PubKey(toHex(alicePubKey)), // sender
                (sigResps) => findSig(sigResps, alicePubKey), // sig
                PubKey(toHex(bobPubKey)), // receiver
                {
                    pubKeyOrAddrToSign: alicePubKey,
                    next: {
                        instance: bobInstance,
                        balance: aliceInstance.balance,
                        atOutputIndex: 0,
                    },
                } as MethodCallOptions<Erc721>
            )
        console.log('Erc721 contract called (transferFrom): ', transferTx.id)
        result = transferTx.verifyScript(transferAtInputIndex)
        expect(result.success, result.error).to.eq(true)

        // bob burn
        const burnInstance = bobInstance.next()
        burnInstance.owners.delete(tokenId)

        const { tx: burnTx, atInputIndex: burnAtInputIndex } =
            await bobInstance.methods.burn(
                tokenId, // tokenId
                PubKey(toHex(bobPubKey)), // sender
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
        console.log('Erc721 contract called (burn): ', burnTx.id)
        result = burnTx.verifyScript(burnAtInputIndex)
        expect(result.success, result.error).to.eq(true)
    })
})
