import { Matrix } from '../src/contracts/matrix'
import { getDefaultSigner } from './utils/helper'

import { expect } from 'chai'

async function main() {
    Matrix.loadArtifact()

    const instance = new Matrix()

    await instance.connect(getDefaultSigner())
    const deployTx = await instance.deploy(1)
    console.log(`Matrix contract deployed:  ${deployTx.id}`)

    const callContract = async () => {
        await instance.methods.main([
            [1n, 1n, 1n, 1n],
            [2n, 2n, 2n, 2n],
            [3n, 3n, 3n, 3n],
            [4n, 4n, 4n, 4n],
        ])
        expect(callContract()).not.Throw
    }
}
describe('Test SmartContract `Matrix`', () => {
    it('should succeed', async () => {
        await main()
    })
})
