import { expect, use } from 'chai'
import { HashedMapNonState } from '../src/contracts/hashedMapNonState'
import { ByteString, HashedMap, toByteString } from 'scrypt-ts'
import chaiAsPromised from 'chai-as-promised'

import { getDefaultSigner } from './utils/helper'
use(chaiAsPromised)

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
        await hashedMapNonState.connect(getDefaultSigner())
        await hashedMapNonState.deploy(1)
        const callContract = async () =>
            await hashedMapNonState.methods.unlock(7n, toByteString('07'))
        expect(callContract()).not.throw
    })

    it('should delete element successfully.', async () => {
        const map = new HashedMap<bigint, ByteString>([
            [1n, toByteString('0001')],
        ])

        const hashedMapNonState = new HashedMapNonState(map)
        await hashedMapNonState.connect(getDefaultSigner())
        await hashedMapNonState.deploy(1)

        const callContract = async () =>
            await hashedMapNonState.methods.delete(1n)
        expect(callContract()).not.throw
    })

    it('should throw', async () => {
        const map = new HashedMap<bigint, ByteString>([
            [1n, toByteString('0001')],
        ])

        const hashedMapNonState = new HashedMapNonState(map)
        await hashedMapNonState.connect(getDefaultSigner())
        await hashedMapNonState.deploy(1)
        const callContract = async () =>
            await hashedMapNonState.methods.delete(2n)
        return expect(callContract()).to.be.rejectedWith(
            /hashedMap should have the key before delete/
        )
    })
})
