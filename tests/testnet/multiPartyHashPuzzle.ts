import { MultiPartyHashPuzzle } from '../../src/contracts/multiPartyHashPuzzle'
import { sha256, ByteString, FixedArray, Sha256 } from 'scrypt-ts'
import { getDefaultSigner, inputSatoshis } from '../utils/helper'

function generateRandomHex(length) {
    const characters = '0123456789abcdef'
    let hex = ''

    for (let i = 0; i < length * 2; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length)
        hex += characters.charAt(randomIndex)
    }

    return hex
}

async function main() {
    // Construct preimages and hashes.
    const _preimages = []
    const _hashes = []
    for (let i = 0; i < MultiPartyHashPuzzle.N; i++) {
        const preimage = generateRandomHex(32)
        _preimages.push(preimage)
        _hashes.push(sha256(preimage))
    }
    const preimages = _preimages as FixedArray<
        ByteString,
        typeof MultiPartyHashPuzzle.N
    >
    const hashes = _hashes as FixedArray<Sha256, typeof MultiPartyHashPuzzle.N>

    await MultiPartyHashPuzzle.compile()
    const instance = new MultiPartyHashPuzzle(hashes)

    // connect to a signer
    await instance.connect(getDefaultSigner())

    // contract deployment
    const deployTx = await instance.deploy(inputSatoshis)
    console.log('MultiPartyHashPuzzle contract deployed: ', deployTx.id)

    // contract call
    const { tx: callTx } = await instance.methods.unlock(preimages)
    console.log('MultiPartyHashPuzzle contract `unlock` called: ', callTx.id)
}

describe('Test SmartContract `MultiPartyHashPuzzle` on testnet', () => {
    it('should succeed', async () => {
        await main()
    })
})
