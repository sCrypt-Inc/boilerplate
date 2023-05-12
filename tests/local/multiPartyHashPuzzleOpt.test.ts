import { expect, use } from 'chai'
import {
    ByteString,
    FixedArray,
    MethodCallOptions,
    Sha256,
    sha256,
    toByteString,
} from 'scrypt-ts'
import { MultiPartyHashPuzzleOpt } from '../../src/contracts/multiPartyHashPuzzleOpt'
import chaiAsPromised from 'chai-as-promised'
import { getDummySigner, getDummyUTXO } from '../utils/helper'
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
        const _preimages = []
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

        await instance.connect(getDummySigner())
    })

    it('should pass using correct preimages.', async () => {
        const { tx: callTx, atInputIndex } = await instance.methods.unlock(
            preimages,
            {
                fromUTXO: getDummyUTXO(),
            } as MethodCallOptions<MultiPartyHashPuzzleOpt>
        )

        const result = callTx.verifyScript(atInputIndex)
        expect(result.success, result.error).to.eq(true)
    })

    it('should throw with a wrong preimage.', async () => {
        const preimagesWrong = Array.from(preimages)
        preimagesWrong[0] = sha256('aabbcc')

        return expect(
            instance.methods.unlock(preimagesWrong, {
                fromUTXO: getDummyUTXO(),
            } as MethodCallOptions<MultiPartyHashPuzzleOpt>)
        ).to.be.rejectedWith(/hash mismatch/)
    })
})
