import { expect, use } from 'chai'
import { HashedSetNonState } from '../src/contracts/hashedSetNonState'
import { HashedSet } from 'scrypt-ts'
import { getDefaultSigner } from './utils/helper'
import chaiAsPromised from 'chai-as-promised'

use(chaiAsPromised)

describe('Test SmartContract `HashedSetNonState`', () => {
    before(async () => {
        await HashedSetNonState.compile()
    })

    it('should unlock contract `HashedSetNonState` successfully.', async () => {
        const set = new HashedSet<bigint>()
        set.add(1n)
        set.add(2n)
        set.add(3n)

        const hashedSetNonState = new HashedSetNonState(set)
        await hashedSetNonState.connect(getDefaultSigner())
        const deployTx = await hashedSetNonState.deploy(1)
        console.log('HashedSetNonState contract deployed: ', deployTx.id)

        const { tx: tx1, atInputIndex: atInputIndex1 } =
            await hashedSetNonState.methods.add(1n)
        let result = tx1.verifyScript(atInputIndex1)
        expect(result.success, result.error).to.eq(true)
        console.log('HashedSetNonState contract called: ', tx1.id)

        const deployTx2 = await hashedSetNonState.deploy(1)
        console.log('HashedSetNonState contract deployed: ', deployTx2.id)

        const { tx: tx2, atInputIndex: atInputIndex2 } =
            await hashedSetNonState.methods.add(7n)
        console.log('HashedSetNonState contract called: ', tx2.id)
        result = tx2.verifyScript(atInputIndex2)
        expect(result.success, result.error).to.eq(true)
    })

    it('should delete element successfully.', async () => {
        const set = new HashedSet<bigint>()
        set.add(1n)

        const hashedSetNonState = new HashedSetNonState(set)
        await hashedSetNonState.connect(getDefaultSigner())
        const deployTx = await hashedSetNonState.deploy(1)
        console.log('HashedSetNonState contract deployed: ', deployTx.id)

        const { tx, atInputIndex } = await hashedSetNonState.methods.delete(1n)
        console.log('HashedSetNonState contract called: ', tx.id)
        const result = tx.verifyScript(atInputIndex)
        expect(result.success, result.error).to.eq(true)
    })

    it('should throw', async () => {
        const set = new HashedSet<bigint>()
        set.add(1n)

        const hashedSetNonState = new HashedSetNonState(set)
        await hashedSetNonState.connect(getDefaultSigner())
        const deployTx = await hashedSetNonState.deploy(1)
        console.log('HashedSetNonState contract deployed: ', deployTx.id)
        return expect(hashedSetNonState.methods.delete(2n)).to.be.rejectedWith(
            /hashedSet should have the key before delete/
        )
    })
})
