import { findSig, MethodCallOptions, PubKey, toHex } from 'scrypt-ts'
import { Recallable } from '../../src/contracts/recallable'
import { getDefaultSigner, randomPrivateKey } from './util/txHelper'
import { myPublicKey } from '../util/privateKey'

async function main() {
    await Recallable.compile()

    // 3 players
    // alice, bob, and me
    const [alicePrivateKey, alicePublicKey, ,] = randomPrivateKey()
    const [, bobPublicKey, ,] = randomPrivateKey()

    // I am the issuer, and the first user as well
    const initialInstance = new Recallable(PubKey(toHex(myPublicKey)))

    // there are 2 keys in the signer
    // `myPrivateKey` (added by default) and `alicePrivateKey`
    await initialInstance.connect(getDefaultSigner(alicePrivateKey))

    // I issue 10 re-callable satoshis
    const satoshisIssued = 10
    const deployTx = await initialInstance.deploy(satoshisIssued)
    console.log(`I issue ${satoshisIssued}: ${deployTx.id}`)

    // the current balance of each player:
    // - me     10 (1 utxo)
    // - alice  0
    // - bob    0

    // I send 7 to alice, keep 3 left
    const satoshisSendToAlice = 7

    const meNextInstance = initialInstance.next()

    const aliceNextInstance = initialInstance.next()
    aliceNextInstance.userPubKey = PubKey(toHex(alicePublicKey))

    const { tx: transferToAliceTx } = await initialInstance.methods.transfer(
        (sigResps) => findSig(sigResps, myPublicKey),
        PubKey(toHex(alicePublicKey)),
        BigInt(satoshisSendToAlice),
        {
            // sign with the private key corresponding to `myPublicKey` (which is `myPrivateKey` in the signer)
            // since I am the current user
            pubKeyOrAddrToSign: myPublicKey,
            next: [
                {
                    instance: aliceNextInstance,
                    balance: satoshisSendToAlice,
                },
                {
                    instance: meNextInstance,
                    balance: satoshisIssued - satoshisSendToAlice,
                },
            ],
        } as MethodCallOptions<Recallable>
    )
    console.log(
        `I send ${satoshisSendToAlice} to Alice: ${transferToAliceTx.id}`
    )

    // the current balance of each player:
    // - me     3 (1 utxo)
    // - alice  7 (1 utxo)
    // - bob    0

    // alice sends all the 7 to bob, keeps nothing left
    const satoshisSendToBob = satoshisSendToAlice

    const bobNextInstance = aliceNextInstance.next()
    bobNextInstance.userPubKey = PubKey(toHex(bobPublicKey))

    const { tx: transferToBobTx } = await aliceNextInstance.methods.transfer(
        (sigResps) => findSig(sigResps, alicePublicKey),
        PubKey(toHex(bobPublicKey)),
        BigInt(satoshisSendToBob),
        {
            // sign with the private key corresponding to `alicePublicKey` (which is `alicePrivateKey` in the signer)
            // since she is the current user
            pubKeyOrAddrToSign: alicePublicKey,
            next: {
                instance: bobNextInstance,
                balance: satoshisSendToBob,
                atOutputIndex: 0,
            },
        } as MethodCallOptions<Recallable>
    )
    console.log(
        `Alice sends ${satoshisSendToBob} to Bob: ${transferToBobTx.id}`
    )

    // the current balance of each player:
    // - me     3 (1 utxo)
    // - alice  0
    // - bob    7 (1 utxo)

    // I recall all the 7 from bob
    const meRecallInstance = bobNextInstance.next()
    meRecallInstance.userPubKey = PubKey(toHex(myPublicKey))

    const { tx: recallTx } = await bobNextInstance.methods.recall(
        (sigResps) => findSig(sigResps, myPublicKey),
        {
            // sign with the private key corresponding to `myPublicKey` (which is `myPrivateKey` in the signer)
            // since I am the issuer at the beginning
            pubKeyOrAddrToSign: myPublicKey,
            next: {
                instance: meRecallInstance,
                balance: satoshisSendToBob,
                atOutputIndex: 0,
            },
        } as MethodCallOptions<Recallable>
    )
    console.log(`I recall ${satoshisSendToBob} from Bob: ${recallTx.id}`)

    // the current balance of each player:
    // - me     10 (2 utxos)
    // - alice  0
    // - bob    0
}

describe('Test SmartContract `Recallable` on testnet', () => {
    it('should succeed', async () => {
        await main()
    })
})
