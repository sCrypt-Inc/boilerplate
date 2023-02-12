import { expect } from 'chai'
import { MethodCallOptions, Sha256, sha256, toByteString } from 'scrypt-ts'
import { HashPuzzle } from '../../src/contracts/hashPuzzle'
import { dummySigner, dummyUTXO } from './util/txHelper'

const plainText = 'abc'
const byteString = toByteString(plainText, true)
const sha256Data = sha256(byteString)

describe('Test SmartContract `HashPuzzle`', () => {
    before(async () => {
        await HashPuzzle.compile()
    })

    it('should pass the public method unit test successfully.', async () => {
        const hashPuzzle = new HashPuzzle(Sha256(sha256Data))
        await hashPuzzle.connect(dummySigner())
        const { tx: callTx, atInputIndex } = await hashPuzzle.methods.unlock(
            byteString,
            {
                fromUTXO: dummyUTXO,
            } as MethodCallOptions<HashPuzzle>
        )

        const result = callTx.verifyInputScript(atInputIndex)
        expect(result.success, result.error).to.eq(true)
    })
})
