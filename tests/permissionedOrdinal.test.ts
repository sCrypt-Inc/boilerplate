import { getDefaultSigner, randomPrivateKey } from './utils/helper'
import {
    bsv,
    findSig,
    hash160,
    MethodCallOptions,
    PubKey,
    PubKeyHash,
    toHex,
} from 'scrypt-ts'
import { myPrivateKey, myPublicKey } from './utils/privateKey'
import { PermissionedOrdinal } from '../src/contracts/permissionedOrdinal'
import { expect } from 'chai'

describe('Test SmartContract `PermissionedOrdinal`', () => {
    const privateKeyIssuer = myPrivateKey
    const publicKeyIssuer = myPublicKey
    const addressIssuer = publicKeyIssuer.toAddress()

    const ownerPrivateKeys: bsv.PrivateKey[] = []
    const ownerPublicKeys: bsv.PublicKey[] = []
    const ownerAddresses: bsv.Address[] = []

    let permissionedOrdinal: PermissionedOrdinal

    before(async () => {
        await PermissionedOrdinal.compile()

        for (let i = 0; i < 4; i++) {
            const [privateKeyBidder, publicKeyBidder, , addressBidder] =
                randomPrivateKey()
            ownerPrivateKeys.push(privateKeyBidder)
            ownerPublicKeys.push(publicKeyBidder)
            ownerAddresses.push(addressBidder)
        }

        permissionedOrdinal = new PermissionedOrdinal(
            PubKey(toHex(publicKeyIssuer)),
            PubKeyHash(hash160(ownerPublicKeys[0].toHex())),
            33n
        )

        await permissionedOrdinal.connect(getDefaultSigner(privateKeyIssuer))
    })

    it('should succeed', async () => {
        // contract deployment
        const deployRes = await permissionedOrdinal.deploy(1)
        console.log(`PermissionedOrdinal deployed: ${deployRes.id}`)

        let currentInstance = permissionedOrdinal

        // Perform transfers.
        for (let i = 0; i < 3; i++) {
            await permissionedOrdinal.connect(
                getDefaultSigner([privateKeyIssuer, ownerPrivateKeys[i]])
            )

            const newOwnerAddr = hash160(ownerPublicKeys[i + 1].toHex())

            const nextInstance = currentInstance.next()
            nextInstance.currentOwner = newOwnerAddr

            const callContract = async () => {
                const res = await currentInstance.methods.transfer(
                    (sigResps) => findSig(sigResps, ownerPublicKeys[i]),
                    PubKey(ownerPublicKeys[i].toHex()),
                    (sigResps) => findSig(sigResps, publicKeyIssuer),
                    newOwnerAddr,
                    {
                        changeAddress: addressIssuer,
                        fromUTXO: currentInstance.utxo,
                        pubKeyOrAddrToSign: [
                            publicKeyIssuer,
                            ownerPublicKeys[i],
                        ],
                        next: {
                            instance: nextInstance,
                            balance: 1,
                        },
                    } as MethodCallOptions<PermissionedOrdinal>
                )

                console.log(
                    `Method \`transfer\`successfully called: ${res.tx.id}`
                )
            }

            expect(await callContract()).not.throw

            currentInstance = nextInstance
        }
    })
})
