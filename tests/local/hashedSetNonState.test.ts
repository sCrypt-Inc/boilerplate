import { expect } from 'chai'
import { HashedSetNonState } from '../../src/contracts/hashedSetNonState'
import { HashedSet, MethodCallOptions } from 'scrypt-ts'
import { dummyUTXO, getDummySigner } from '../utils/helper'

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
        await hashedSetNonState.connect(getDummySigner())

        const { tx: tx1, atInputIndex: atInputIndex1 } =
            await hashedSetNonState.methods.add(1n, {
                fromUTXO: dummyUTXO,
            } as MethodCallOptions<HashedSetNonState>)
        let result = tx1.verifyScript(atInputIndex1)
        expect(result.success, result.error).to.eq(true)

        const { tx: tx2, atInputIndex: atInputIndex2 } =
            await hashedSetNonState.methods.add(7n, {
                fromUTXO: dummyUTXO,
            } as MethodCallOptions<HashedSetNonState>)
        result = tx2.verifyScript(atInputIndex2)
        expect(result.success, result.error).to.eq(true)
    })

    it('should delete element successfully.', async () => {
        const set = new HashedSet<bigint>()
        set.add(1n)

        const hashedSetNonState = new HashedSetNonState(set)
        await hashedSetNonState.connect(getDummySigner())

        const { tx, atInputIndex } = await hashedSetNonState.methods.delete(
            1n,
            {
                fromUTXO: dummyUTXO,
            } as MethodCallOptions<HashedSetNonState>
        )
        const result = tx.verifyScript(atInputIndex)
        expect(result.success, result.error).to.eq(true)
    })

    it('should throw', async () => {
        const set = new HashedSet<bigint>()
        set.add(1n)

        const hashedSetNonState = new HashedSetNonState(set)
        await hashedSetNonState.connect(getDummySigner())

        return expect(
            hashedSetNonState.methods.delete(2n, {
                fromUTXO: dummyUTXO,
            } as MethodCallOptions<HashedSetNonState>)
        ).to.be.rejectedWith(/hashedSet should have the key before delete/)
    })
})
