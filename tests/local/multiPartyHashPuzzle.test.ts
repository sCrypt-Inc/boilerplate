import { expect, use } from 'chai'
import {
    ByteString,
    FixedArray,
    MethodCallOptions,
    Sha256,
    sha256,
} from 'scrypt-ts'
import { MultiPartyHashPuzzle } from '../../src/contracts/multiPartyHashPuzzle'
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

describe('Test SmartContract `MultiPartyHashPuzzle`', () => {
    let instance: MultiPartyHashPuzzle

    let preimages: FixedArray<ByteString, typeof MultiPartyHashPuzzle.N>
    let hashes: FixedArray<Sha256, typeof MultiPartyHashPuzzle.N>

    before(async () => {
        const _preimages = []
        const _hashes = []
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

        await MultiPartyHashPuzzle.compile()
        instance = new MultiPartyHashPuzzle(hashes)

        await instance.connect(getDummySigner())
    })

    it('should pass using correct preimages.', async () => {
        const { tx: callTx, atInputIndex } = await instance.methods.unlock(
            preimages,
            {
                fromUTXO: getDummyUTXO(),
            } as MethodCallOptions<MultiPartyHashPuzzle>
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
            } as MethodCallOptions<MultiPartyHashPuzzle>)
        ).to.be.rejectedWith(/hash mismatch/)
    })
})
