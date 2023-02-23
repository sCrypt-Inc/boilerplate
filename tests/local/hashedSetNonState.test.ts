import { expect } from 'chai'
import { HashedSetNonState } from '../../src/contracts/hashedSetNonState'
import { HashedSet } from 'scrypt-ts'

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

        let result = hashedSetNonState.verify(() => hashedSetNonState.add(1n))
        expect(result.success, result.error).to.eq(true)

        result = hashedSetNonState.verify(() => hashedSetNonState.add(7n))
        expect(result.success, result.error).to.eq(true)
    })

    it('should delete element successfully.', async () => {
        const set = new HashedSet<bigint>()

        set.add(1n)
        set.add(2n)
        set.add(10n)

        const hashedSetNonState = new HashedSetNonState(set)

        let result = hashedSetNonState.verify(() =>
            hashedSetNonState.delete(2n)
        )
        expect(result.success, result.error).to.eq(true)

        expect(() => {
            result = hashedSetNonState.verify(() =>
                hashedSetNonState.delete(3n)
            )
        }).to.throw(/hashedSet should have the key before delete/)
    })
})
