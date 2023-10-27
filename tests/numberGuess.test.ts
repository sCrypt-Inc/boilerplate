import { MethodCallOptions, PubKey, findSig } from 'scrypt-ts'
import { NumberGuess } from '../src/contracts/numberGuess'
import { getDefaultSigner, randomPrivateKey } from './utils/helper'

import { expect } from 'chai'

describe('Test SmartContract `NumberGuess`', () => {
    let numbergs : NumberGuess
     const [privateKeyalice, publicKeyalice] = randomPrivateKey()
    const [privateKeybob, publicKeybob] = randomPrivateKey()
    
    before(async () => {
    NumberGuess.loadArtifact()

     numbergs = new NumberGuess(
        PubKey(publicKeyalice.toByteString()),
        PubKey(publicKeybob.toByteString()),
        3n,
        3n
    )

    await numbergs.connect(getDefaultSigner([privateKeyalice, privateKeybob]))
    })

    it('should pass the public method successfully' , async () => {
    await numbergs.deploy(1)

    const call = async () => {
        const { tx: callTx, atInputIndex } = await numbergs.methods.guess(
            (sigResps) => findSig(sigResps, publicKeybob),
            {
                pubKeyOrAddrToSign: publicKeybob,
            } as MethodCallOptions<NumberGuess>
        )
    }

    await expect(call()).to.be.not.rejected
})
})
