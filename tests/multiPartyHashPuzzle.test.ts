import { expect, use } from 'chai'
import { ByteString, FixedArray, Sha256, sha256 } from 'scrypt-ts'
import { MultiPartyHashPuzzle } from '../src/contracts/multiPartyHashPuzzle'
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

describe('Test SmartContract `MultiPartyHashPuzzle`', () => {
    let instance: MultiPartyHashPuzzle

    let preimages: FixedArray<ByteString, typeof MultiPartyHashPuzzle.N>
    let hashes: FixedArray<Sha256, typeof MultiPartyHashPuzzle.N>

    before(async () => {
        const _preimages: Array<ByteString> = []
        const _hashes: Array<Sha256> = []
        for (let i = 0; i < MultiPartyHashPuzzle.N; i++) {
            const preimage = generateRandomHex(32)
            _preimages.push(preimage)
            _hashes.push(sha256(preimage))
        }
        preimages = _preimages as FixedArray<
            ByteString,
            typeof MultiPartyHashPuzzle.N
        >
        hashes = _hashes as FixedArray<Sha256, typeof MultiPartyHashPuzzle.N>

        MultiPartyHashPuzzle.loadArtifact()
        instance = new MultiPartyHashPuzzle(hashes)

        await instance.connect(getDefaultSigner())
    })

    it('should pass using correct preimages.', async () => {
        await instance.deploy(1)
        const callContract = async () => instance.methods.unlock(preimages)
        return expect(callContract()).not.rejected
    })

    it('should throw with a wrong preimage.', async () => {
        await instance.deploy(1)
        const preimagesWrong = Array.from(preimages)
        preimagesWrong[0] = sha256('aabbcc')
        const callContract = async () => instance.methods.unlock(preimagesWrong)
        return expect(callContract()).to.be.rejectedWith(/hash mismatch/)
    })
})
