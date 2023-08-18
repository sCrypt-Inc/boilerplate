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

        await MultiPartyHashPuzzleOpt.compile()
        instance = new MultiPartyHashPuzzleOpt(combinedHash)

        await instance.connect(getDefaultSigner())

        const deployTx = await instance.deploy(1)
        console.log('MultiPartyHashPuzzleOpt contract deployed: ', deployTx.id)
    })

    it('should pass using correct preimages.', async () => {
        const { tx: callTx, atInputIndex } = await instance.methods.unlock(
            preimages
        )
        console.log('MultiPartyHashPuzzleOpt contract called: ', callTx.id)
        const result = callTx.verifyScript(atInputIndex)
        expect(result.success, result.error).to.eq(true)
    })

    it('should throw with a wrong preimage.', async () => {
        const preimagesWrong = Array.from(preimages)
        preimagesWrong[0] = sha256('aabbcc')

        return expect(
            instance.methods.unlock(preimagesWrong)
        ).to.be.rejectedWith(/hash mismatch/)
    })
})
