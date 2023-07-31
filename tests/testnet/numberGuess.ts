import { NumberGuess } from '../../src/contracts/numberGuess'
import { myPrivateKey, myPublicKey } from '../utils/privateKey'
import { getDefaultSigner } from '../utils/helper'

import { MethodCallOptions, PubKey, findSig, toHex } from 'scrypt-ts'

async function main() {
    await NumberGuess.compile()
    const privateKeyAlice = myPrivateKey
    const publicKeyAlice = myPublicKey

    const privateKeyBob = myPrivateKey
    const publicKeyBob = myPublicKey
    const instance = new NumberGuess(
        PubKey(toHex(publicKeyAlice)),
        PubKey(toHex(publicKeyBob)),
        3n,
        3n
    )

    // connect to a signer
    await instance.connect(getDefaultSigner())

    // contract deployment
    const amount = 1
    const deployTx = await instance.deploy(amount)
    console.log('Numbergs contract deployed: ', deployTx.id)

    const { tx: guessTx } = await instance.methods.guess(
        (sigReps) => findSig(sigReps, publicKeyAlice),
        {
            pubKeyOrAddrToSign: publicKeyAlice,
        } as MethodCallOptions<NumberGuess>
    )
    console.log('guess method call successfully: ', guessTx.id)
}

describe('Test SmartContract `NumberGuess` on testnet', () => {
    it('should succeed', async () => {
        await main()
    })
})
