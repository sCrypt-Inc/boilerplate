import { expect } from 'chai'
import { sha256, toByteString } from 'scrypt-ts'
import { HashLock } from '../src/contracts/hashLock'
import { getDefaultSigner } from './utils/helper'

const plainText = 'abc'
const byteString = toByteString(plainText, true)
const sha256Data = sha256(byteString)

describe('Test SmartContract `HashPuzzle`', () => {
    before(() => {
        HashLock.loadArtifact()
    })
    it('should pass the public method unit test successfully.', async () => {
        const hashLock = new HashLock(sha256Data)
        await hashLock.connect(getDefaultSigner())

        await hashLock.deploy(1)
        const callContract = async () => hashLock.methods.unlock(byteString)
        return expect(callContract()).not.rejected
    })
})
