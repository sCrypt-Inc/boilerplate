import { Callee, Coeff } from '../src/contracts/callee'
import { getDefaultSigner } from './utils/helper'
import { expect, use } from 'chai'
import chaiAsPromised from 'chai-as-promised'
use(chaiAsPromised)

describe('Test SmartContract `Callee`', async () => {
    let instance: Callee
    const coeff: Coeff = {
        a: 1n,
        b: -3n,
        c: 2n,
    }
    const x: bigint = 2n

    before(async () => {
        await Callee.loadArtifact()

        instance = new Callee()

        await instance.connect(getDefaultSigner())
    })

    it('should solve the equation correctly', async () => {
        await instance.deploy(1)
        instance.bindTxBuilder('solve', Callee.buildTxForSolve)

        const callContract = async () => {
            await instance.methods.solve(coeff, x)
        }
        return expect(callContract()).not.throw
    })
})
