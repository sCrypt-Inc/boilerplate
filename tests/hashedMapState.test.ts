import { expect } from 'chai'

import { HashedMapState } from '../src/contracts/hashedMapState'
import {
    ByteString,
    HashedMap,
    int2ByteString,
    MethodCallOptions,
    toByteString,
} from 'scrypt-ts'
import { getDefaultSigner } from './utils/helper'

describe('Test SmartContract `HashedMapState`', () => {
    let map: HashedMap<bigint, ByteString>, stateMap: HashedMapState
    before(async () => {
        HashedMapState.loadArtifact()

        map = new HashedMap<bigint, ByteString>()

        stateMap = new HashedMapState(map)
        await stateMap.connect(getDefaultSigner())
    })

    async function insert(
        instance: HashedMapState,
        key: bigint,
        val: ByteString
    ) {
        const newInstance = instance.next()

        newInstance.hashedmap.set(key, val)

        const { nexts, tx } = await instance.methods.insert(key, val, {
            next: {
                instance: newInstance,
                balance: instance.balance,
            },
        } as MethodCallOptions<HashedMapState>)

        return {
            tx: tx,
            newInstance: nexts[0].instance,
        }
    }

    async function canGet(
        instance: HashedMapState,
        key: bigint,
        val: ByteString
    ) {
        const newInstance = instance.next()

        const { nexts, tx } = await instance.methods.canGet(key, val, {
            next: {
                instance: newInstance,
                balance: instance.balance,
            },
        } as MethodCallOptions<HashedMapState>)

        return {
            tx: tx,
            newInstance: nexts[0].instance,
        }
    }

    async function notExist(instance: HashedMapState, key: bigint) {
        const newInstance = instance.next()

        const { nexts, tx } = await instance.methods.notExist(key, {
            next: {
                instance: newInstance,
                balance: instance.balance,
            },
        } as MethodCallOptions<HashedMapState>)

        return {
            tx: tx,
            newInstance: nexts[0].instance,
        }
    }

    async function update(
        instance: HashedMapState,
        key: bigint,
        val: ByteString
    ) {
        const newInstance = instance.next()
        newInstance.hashedmap.set(key, val)

        const { nexts, tx } = await instance.methods.update(key, val, {
            next: {
                instance: newInstance,
                balance: instance.balance,
            },
        } as MethodCallOptions<HashedMapState>)

        return {
            tx: tx,
            newInstance: nexts[0].instance,
        }
    }

    async function deleteKey(instance: HashedMapState, key: bigint) {
        const newInstance = instance.next()
        newInstance.hashedmap.delete(key)
        const { nexts, tx } = await instance.methods.delete(key, {
            next: {
                instance: newInstance,
                balance: instance.balance,
            },
        } as MethodCallOptions<HashedMapState>)

        return {
            tx: tx,
            newInstance: nexts[0].instance,
        }
    }

    it('insert, canGet, update, delete should pass', async () => {
        await stateMap.deploy(1)

        const { newInstance: newInstance1 } = await insert(
            stateMap,
            1n,
            toByteString('0001')
        )

        const { newInstance: newInstance2 } = await insert(
            newInstance1,
            2n,
            toByteString('0002')
        )

        const { newInstance: newInstance3 } = await canGet(
            newInstance2,
            2n,
            toByteString('0002')
        )

        const { newInstance: newInstance4 } = await canGet(
            newInstance3,
            1n,
            toByteString('0001')
        )

        const { newInstance: newInstance5 } = await update(
            newInstance4,
            1n,
            toByteString('000001')
        )

        const { newInstance: newInstance6 } = await update(
            newInstance5,
            2n,
            toByteString('000002')
        )

        const { newInstance: newInstance7 } = await canGet(
            newInstance6,
            1n,
            toByteString('000001')
        )

        const { newInstance: newInstance8 } = await canGet(
            newInstance7,
            2n,
            toByteString('000002')
        )

        const { newInstance: newInstance9 } = await deleteKey(newInstance8, 2n)

        expect(await notExist(newInstance9, 2n)).not.throw
    })

    it('unlock should pass', async () => {
        const map = new HashedMap<bigint, ByteString>()

        const key = 2n
        const val = toByteString('0a0a0a0a0a')

        const instance = new HashedMapState(map)
        await instance.connect(getDefaultSigner())

        await instance.deploy(1)

        const newInstance = instance.next()

        for (let i = 0; i < 5; i++) {
            newInstance.hashedmap.set(
                BigInt(i),
                int2ByteString(BigInt(i), BigInt(i))
            )
        }

        for (let i = 0; i < 5; i++) {
            if (i === 3) {
                newInstance.hashedmap.delete(key)
            } else if (i == 4) {
                newInstance.hashedmap.set(key, val)
            }
        }

        const callContract = async () =>
            instance.methods.unlock(key, val, {
                next: {
                    instance: newInstance,
                    balance: instance.balance,
                },
            } as MethodCallOptions<HashedMapState>)

        return expect(callContract()).not.rejected
    })
})
