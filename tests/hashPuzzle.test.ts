import { expect } from 'chai'
import { sha256, toByteString } from 'scrypt-ts'
import { HashPuzzle } from '../src/contracts/hashPuzzle'
import { getDefaultSigner } from './utils/helper'

const plainText = 'abc'
const byteString = toByteString(plainText, true)
const sha256Data = sha256(byteString)

describe('Test SmartContract `HashPuzzle`', () => {
    before(() => {
        HashPuzzle.loadArtifact()
    })

    it('should pass the public method unit test successfully.', async () => {
        const hashPuzzle = new HashPuzzle(sha256Data)
        await hashPuzzle.connect(getDefaultSigner())

        await hashPuzzle.deploy(1)
        const callContract = async () => hashPuzzle.methods.unlock(byteString)
        return expect(callContract()).not.rejected
    })
})
