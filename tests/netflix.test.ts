import {
    MethodCallOptions,
    PubKey,
    Sha256,
    findSig,
    toByteString,
    toHex,
} from 'scrypt-ts'
import { Netflix } from '../src/contracts/netflix'
import { getDefaultSigner, randomPrivateKey } from './utils/helper'

import { expect } from 'chai'

describe('Test SmartContract `Netflix`', () => {
    const [privateKeyalice, publicKeyalice] = randomPrivateKey()
    const [_, publicKeybob] = randomPrivateKey()

    let netflix: Netflix
    before(async () => {
        Netflix.loadArtifact()

        netflix = new Netflix(
            PubKey(publicKeyalice.toByteString()),
            PubKey(publicKeybob.toByteString()),
            Sha256(toByteString('hello', true))
        )

        await netflix.connect(getDefaultSigner(privateKeyalice))
    })

    it('should succeed', async () => {
        await netflix.deploy(1)
        const callContract = async () =>
            netflix.methods.unlock(
                toByteString('hello', true),
                (sigResps) => findSig(sigResps, publicKeyalice),
                {
                    pubKeyOrAddrToSign: publicKeyalice,
                } as MethodCallOptions<Netflix>
            )
        return expect(callContract()).not.rejected
    })
})
