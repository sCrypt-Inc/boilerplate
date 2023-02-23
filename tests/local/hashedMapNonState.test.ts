import { expect } from 'chai'
import { HashedMapNonState } from '../../src/contracts/hashedMapNonState'
import { ByteString, HashedMap, toByteString } from 'scrypt-ts'

describe('Test SmartContract `HashedMapNonState`', () => {
    before(async () => {
        await HashedMapNonState.compile()
    })

    it('should unlock `HashedMapNonState` successfully.', async () => {
        const map = new HashedMap<bigint, ByteString>()

        map.set(1n, toByteString('0001'))
        map.set(2n, toByteString('0011'))
        map.set(10n, toByteString('0111'))

        const hashedMapNonState = new HashedMapNonState(map)

        const result = hashedMapNonState.verify(() =>
            hashedMapNonState.unlock(7n, toByteString('07'))
        )

        expect(result.success, result.error).to.eq(true)
    })

    it('should delete element successfully.', async () => {
        const map = new HashedMap<bigint, ByteString>([
            [1n, toByteString('0001')],
            [2n, toByteString('0011')],
            [10n, toByteString('0111')],
        ])

        const hashedMapNonState = new HashedMapNonState(map)

        let result = hashedMapNonState.verify(() =>
            hashedMapNonState.delete(2n)
        )
        expect(result.success, result.error).to.eq(true)

        expect(() => {
            result = hashedMapNonState.verify(() =>
                hashedMapNonState.delete(9n)
            )
        }).to.throw(/hashedMap should have the key before delete/)
    })
})
