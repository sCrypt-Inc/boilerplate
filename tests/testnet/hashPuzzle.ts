import { HashPuzzle } from '../../src/contracts/hashPuzzle'
import { getDefaultSigner, inputSatoshis } from '../utils/helper'
import { sha256, toByteString } from 'scrypt-ts'

async function main() {
    await HashPuzzle.compile()

    const plainText = 'abc'
    const byteString = toByteString(plainText, true)
    const sha256Data = sha256(byteString)

    const hashPuzzle = new HashPuzzle(sha256Data)

    await hashPuzzle.connect(getDefaultSigner())

    // contract deployment
    const deployTx = await hashPuzzle.deploy(inputSatoshis)
    console.log('HashPuzzle contract deployed: ', deployTx.id)

    // contract call
    const { tx: callTx } = await hashPuzzle.methods.unlock(byteString)
    console.log('HashPuzzle contract called: ', callTx.id)
}

describe('Test SmartContract `HashPuzzle` on testnet', () => {
    it('should succeed', async () => {
        await main()
    })
})
