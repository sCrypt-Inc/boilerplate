import { getDefaultSigner, randomPrivateKey } from './utils/helper'
import {
    bsv,
    findSig,
    MethodCallOptions,
    PubKey,
    toByteString,
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
        PermissionedOrdinal.loadArtifact()

        for (let i = 0; i < 4; i++) {
            const [privateKeyBidder, publicKeyBidder, addressBidder] =
                randomPrivateKey()
            ownerPrivateKeys.push(privateKeyBidder)
            ownerPublicKeys.push(publicKeyBidder)
            ownerAddresses.push(addressBidder)
        }

        permissionedOrdinal = new PermissionedOrdinal(
            PubKey(publicKeyIssuer.toByteString()),
            PubKey(ownerPublicKeys[0].toByteString())
        )

        await permissionedOrdinal.connect(getDefaultSigner(privateKeyIssuer))
    })

    it('should succeed', async () => {
        // Ordinal deployment
        const deployRes = await permissionedOrdinal.inscribeText(
            'Hello, sCrypt!'
        )
        console.log(
            `PermissionedOrdinal deployed and inscribed: ${deployRes.id}`
        )

        let currentInstance = permissionedOrdinal

        // Perform transfers.
        for (let i = 0; i < 3; i++) {
            await permissionedOrdinal.connect(
                getDefaultSigner([privateKeyIssuer, ownerPrivateKeys[i]])
            )

            const newOwner = PubKey(ownerPublicKeys[i + 1].toByteString())

            const nextInstance = currentInstance.next()
            nextInstance.currentOwner = newOwner

            const callContract = async () => {
                const res = await currentInstance.methods.transfer(
                    (sigResps) => findSig(sigResps, ownerPublicKeys[i]),
                    (sigResps) => findSig(sigResps, publicKeyIssuer),
                    newOwner,
                    {
                        changeAddress: addressIssuer,
                        pubKeyOrAddrToSign: [
                            publicKeyIssuer,
                            ownerPublicKeys[i],
                        ],
                        transfer: nextInstance,
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
