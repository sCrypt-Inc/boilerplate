import { expect } from 'chai'
import { Sha256, sha256, toHex } from 'scrypt-ts'
import { HashPuzzle } from '../../src/contracts/hashpuzzle'

const data = toHex(Buffer.from('abc'))
const sha256Data = sha256(data)

describe('Test SmartContract `HashPuzzle`', () => {
    before(async () => {
        await HashPuzzle.compile()
    })

    it('should pass the public method unit test successfully.', async () => {
        const hashPuzzle = new HashPuzzle(Sha256(sha256Data))

        const result = hashPuzzle.verify(() => hashPuzzle.unlock(data))
        expect(result.success, result.error).to.eq(true)
    })
})
