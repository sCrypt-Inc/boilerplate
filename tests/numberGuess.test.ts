import { MethodCallOptions, PubKey, findSig } from 'scrypt-ts'
import { NumberGuess } from '../src/contracts/numberGuess'
import { getDefaultSigner, randomPrivateKey } from './utils/helper'

import { expect } from 'chai'

async function main() {
    NumberGuess.loadArtifact()

    const [privateKeyalice, publicKeyalice] = randomPrivateKey()
    const [privateKeybob, publicKeybob] = randomPrivateKey()

    const numbergs = new NumberGuess(
        PubKey(publicKeyalice.toByteString()),
        PubKey(publicKeybob.toByteString()),
        3n,
        3n
    )

    await numbergs.connect(getDefaultSigner([privateKeyalice, privateKeybob]))

    const deployTx = await numbergs.deploy(1)
    console.log('NumberGuess contract deployed: ', deployTx.id)

    const call = async () => {
        const { tx: callTx, atInputIndex } = await numbergs.methods.guess(
            (sigResps) => findSig(sigResps, publicKeybob),
            {
                pubKeyOrAddrToSign: publicKeybob,
            } as MethodCallOptions<NumberGuess>
        )
        console.log('NumberGuess contract called: ', callTx.id)
    }

    await expect(call()).to.be.not.rejected
}

describe('Test SmartContract `NumberGS` unit test', () => {
    it('should succeed', async () => {
        await main()
    })
})
