import { MethodCallOptions, PubKey, findSig, toHex } from 'scrypt-ts'
import { NumberGuess } from '../src/contracts/numberGuess'
import { getDefaultSigner, randomPrivateKey } from './utils/helper'

import { expect } from 'chai'

async function main() {
    await NumberGuess.compile()

    const [privateKeyalice, publicKeyalice] = randomPrivateKey()
    const [privateKeybob, publicKeybob] = randomPrivateKey()

    const numbergs = new NumberGuess(
        PubKey(toHex(publicKeyalice)),
        PubKey(toHex(publicKeybob)),
        3n,
        3n
    )

    await numbergs.connect(getDefaultSigner([privateKeyalice, privateKeybob]))

    const deployTx = await numbergs.deploy(1)
    console.log('NumberGuess contract deployed: ', deployTx.id)

    const { tx: callTx, atInputIndex } = await numbergs.methods.guess(
        (sigResps) => findSig(sigResps, publicKeyalice && publicKeybob),
        {
            pubKeyOrAddrToSign: publicKeyalice && publicKeybob,
        } as MethodCallOptions<NumberGuess>
    )

    console.log('NumberGuess contract called: ', callTx.id)

    const result = callTx.verifyScript(atInputIndex)
    expect(result.success, result.error).to.eq(true)
}

describe('Test SmartContract `NumberGS` unit test', () => {
    it('should succeed', async () => {
        await main()
    })
})
