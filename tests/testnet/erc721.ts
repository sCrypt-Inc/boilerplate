import { Erc721 } from '../../src/contracts/erc721'
import { getDefaultSigner, randomPrivateKey } from '../utils/helper'
import { findSig, HashedMap, MethodCallOptions, PubKey, toHex } from 'scrypt-ts'
import { myPublicKey } from '../utils/privateKey'

async function main() {
    await Erc721.compile()

    const [alicePrivateKey, alicePubKey, ,] = randomPrivateKey()
    const [bobPrivateKey, bobPubKey, ,] = randomPrivateKey()
    const tokenId = 1n

    const owners: HashedMap<bigint, PubKey> = new HashedMap<bigint, PubKey>()

    const erc721 = new Erc721(PubKey(toHex(myPublicKey)), owners)
    await erc721.connect(getDefaultSigner([alicePrivateKey, bobPrivateKey]))

    // contract deployment

    const lockedSatoshi = 1
    const deployTx = await erc721.deploy(lockedSatoshi)
    console.log(`Erc721 contract deployed: ${deployTx.id}`)

    // mint to alice

    const aliceInstance = erc721.next()
    aliceInstance.owners.set(tokenId, PubKey(toHex(alicePubKey)))

    const { tx: mintTx } = await erc721.methods.mint(
        tokenId, // tokenId
        PubKey(toHex(alicePubKey)), // mintTo
        (sigResps) => findSig(sigResps, myPublicKey), // minterSig
        {
            pubKeyOrAddrToSign: myPublicKey,
            next: {
                instance: aliceInstance,
                balance: lockedSatoshi,
                atOutputIndex: 0,
            },
        } as MethodCallOptions<Erc721>
    )
    console.log(`Erc721 contract called, mint to alice: ${mintTx.id}`)

    // transfer from alice to bob

    const bobInstance = aliceInstance.next()
    bobInstance.owners.set(tokenId, PubKey(toHex(bobPubKey)))

    const { tx: transferTx } = await aliceInstance.methods.transferFrom(
        1n, // tokenId
        PubKey(toHex(alicePubKey)), // sender
        (sigResps) => findSig(sigResps, alicePubKey), // sig
        PubKey(toHex(bobPubKey)), // receiver
        {
            pubKeyOrAddrToSign: alicePubKey,
            next: {
                instance: bobInstance,
                balance: lockedSatoshi,
                atOutputIndex: 0,
            },
        } as MethodCallOptions<Erc721>
    )
    console.log(
        `Erc721 contract called, transfer from alice to bob: ${transferTx.id}`
    )

    // bob burn
    const burnInstance = bobInstance.next()
    burnInstance.owners.delete(tokenId)

    const { tx: burnTx } = await bobInstance.methods.burn(
        tokenId, // tokenId
        PubKey(toHex(bobPubKey)), // sender
        (sigResps) => findSig(sigResps, bobPubKey), // sig
        {
            pubKeyOrAddrToSign: bobPubKey,
            next: {
                instance: burnInstance,
                balance: lockedSatoshi,
                atOutputIndex: 0,
            },
        } as MethodCallOptions<Erc721>
    )
    console.log(`Erc721 contract called, bob burn: ${burnTx.id}`)
}

describe('Test SmartContract `Erc721` on testnet', () => {
    it('should succeed', async () => {
        await main()
    })
})
