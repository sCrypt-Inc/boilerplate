import { expect, use } from 'chai'
import { HashedSetNonState } from '../src/contracts/hashedSetNonState'
import { HashedSet } from 'scrypt-ts'
import { getDefaultSigner } from './utils/helper'
import chaiAsPromised from 'chai-as-promised'

use(chaiAsPromised)

describe('Test SmartContract `HashedSetNonState`', () => {
    before(() => {
        HashedSetNonState.loadArtifact()
    })

    it('should unlock contract `HashedSetNonState` successfully.', async () => {
        const set = new HashedSet<bigint>()
        set.add(1n)
        set.add(2n)
        set.add(3n)

        const hashedSetNonState = new HashedSetNonState(set)
        await hashedSetNonState.connect(getDefaultSigner())
        await hashedSetNonState.deploy(1)

        let callContract = async () => hashedSetNonState.methods.add(1n)
        await expect(callContract()).not.rejected

        await hashedSetNonState.deploy(1)

        callContract = async () => hashedSetNonState.methods.add(7n)
        await expect(callContract()).not.rejected
    })

    it('should delete element successfully.', async () => {
        const set = new HashedSet<bigint>()
        set.add(1n)

        const hashedSetNonState = new HashedSetNonState(set)
        await hashedSetNonState.connect(getDefaultSigner())
        await hashedSetNonState.deploy(1)
        const callContract = async () => hashedSetNonState.methods.delete(1n)
        return expect(callContract()).not.rejected
    })

    it('should throw', async () => {
        const set = new HashedSet<bigint>()
        set.add(1n)

        const hashedSetNonState = new HashedSetNonState(set)
        await hashedSetNonState.connect(getDefaultSigner())
        await hashedSetNonState.deploy(1)
        const callContract = async () => hashedSetNonState.methods.delete(2n)
        return expect(callContract()).to.be.rejectedWith(
            /hashedSet should have the key before delete/
        )
    })
})
