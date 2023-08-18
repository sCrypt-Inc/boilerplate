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

async function main() {
    await Netflix.compile()

    const [privateKeyalice, publicKeyalice] = randomPrivateKey()
    const [privateKeybob, publicKeybob] = randomPrivateKey()

    const netflix = new Netflix(
        PubKey(toHex(publicKeyalice)),
        PubKey(toHex(publicKeybob)),
        Sha256(toByteString('hello', true))
    )

    await netflix.connect(getDefaultSigner(privateKeyalice))
    const deployTx = await netflix.deploy(1)
    console.log('Netflix contract deployed: ', deployTx.id)

    const { tx: callTx, atInputIndex } = await netflix.methods.unlock(
        toByteString('hello', true),
        (sigResps) => findSig(sigResps, publicKeyalice),
        {
            pubKeyOrAddrToSign: publicKeyalice,
        } as MethodCallOptions<Netflix>
    )
    console.log('Netflix contract called: ', callTx.id)

    const result = callTx.verifyScript(atInputIndex)
    expect(result.success, result.error).to.eq(true)
}
describe('Test SmartContract `Netflix`', () => {
    it('should succeed', async () => {
        await main()
    })
})
