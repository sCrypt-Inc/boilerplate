import { Callee, Coeff } from '../src/contracts/callee'
import { getDefaultSigner } from './utils/helper'
import { expect, use } from 'chai'
import chaiAsPromised from 'chai-as-promised'
use(chaiAsPromised)

async function main() {
    await Callee.compile()

    const instance = new Callee()

    await instance.connect(getDefaultSigner())

    it('should solve the equation correctly', async () => {
        const coeff: Coeff = {
            a: 1n,
            b: -3n,
            c: 2n,
        }
        const x: bigint = 2n
        await instance.deploy(1)

        const callContract = async () => {
            await instance.methods.solve(coeff, x)
            return expect(callContract()).not.be.rejected
        }
    })

    it('should throw when calling solve ', async () => {
        const coeff: Coeff = {
            a: 1n,
            b: 3n,
            c: 2n,
        }

        await instance.deploy(1)

        const callContract = async () => {
            await instance.methods.solve(coeff, 0n)
            return expect(callContract()).to.be.rejectedWith(
                / cannot solve the equation correctly /
            )
        }
    })
}
describe('Test SmartContract `Callee`', async () => {
    await main()
})
