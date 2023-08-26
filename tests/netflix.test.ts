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
        await Netflix.compile()

        netflix = new Netflix(
            PubKey(toHex(publicKeyalice)),
            PubKey(toHex(publicKeybob)),
            Sha256(toByteString('hello', true))
        )

        await netflix.connect(getDefaultSigner(privateKeyalice))
    })

    it('should succeed', async () => {
        await netflix.deploy(1)
        const callContract = async () =>
            await netflix.methods.unlock(
                toByteString('hello', true),
                (sigResps) => findSig(sigResps, publicKeyalice),
                {
                    pubKeyOrAddrToSign: publicKeyalice,
                } as MethodCallOptions<Netflix>
            )
        expect(callContract()).not.throw
    })
})
