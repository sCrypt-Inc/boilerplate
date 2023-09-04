import { expect, use } from 'chai'
import { ByteString, FixedArray, Sha256, sha256, toByteString } from 'scrypt-ts'
import { MultiPartyHashPuzzleOpt } from '../src/contracts/multiPartyHashPuzzleOpt'
import chaiAsPromised from 'chai-as-promised'
import { getDefaultSigner } from './utils/helper'
use(chaiAsPromised)

function generateRandomHex(length) {
    const characters = '0123456789abcdef'
    let hex = ''

    for (let i = 0; i < length * 2; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length)
        hex += characters.charAt(randomIndex)
    }

    return hex
}

describe('Test SmartContract `MultiPartyHashPuzzleOpt`', () => {
    let instance: MultiPartyHashPuzzleOpt

    let preimages: FixedArray<ByteString, typeof MultiPartyHashPuzzleOpt.N>

    before(async () => {
        const _preimages: Array<ByteString> = []
        let combinedHash = toByteString('') as Sha256
        for (let i = 0; i < MultiPartyHashPuzzleOpt.N; i++) {
            const preimage = generateRandomHex(32)
            _preimages.push(preimage)
            combinedHash = sha256(combinedHash + preimage)
        }
        preimages = _preimages as FixedArray<
            ByteString,
            typeof MultiPartyHashPuzzleOpt.N
        >

        MultiPartyHashPuzzleOpt.loadArtifact()
        instance = new MultiPartyHashPuzzleOpt(combinedHash)

        await instance.connect(getDefaultSigner())
    })

    it('should pass using correct preimages.', async () => {
        await instance.deploy(1)
        const callContract = async () => instance.methods.unlock(preimages)
        return expect(callContract()).not.rejected
    })

    it('should throw with a wrong preimage.', async () => {
        const preimagesWrong = Array.from(preimages)
        preimagesWrong[0] = sha256('aabbcc')
        const callContract = async () => instance.methods.unlock(preimagesWrong)
        return expect(callContract()).to.be.rejectedWith(/hash mismatch/)
    })
})
