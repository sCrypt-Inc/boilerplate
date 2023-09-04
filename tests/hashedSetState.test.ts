import { expect } from 'chai'

import { HashedSetState } from '../src/contracts/hashedSetState'
import { HashedSet, MethodCallOptions } from 'scrypt-ts'
import { getDefaultSigner } from './utils/helper'

describe('Test SmartContract `HashedSetState`', () => {
    let set: HashedSet<bigint>, stateSet: HashedSetState
    before(async () => {
        HashedSetState.loadArtifact()

        set = new HashedSet<bigint>()

        stateSet = new HashedSetState(set)
        await stateSet.connect(getDefaultSigner())
    })

    async function add(instance: HashedSetState, key: bigint) {
        const newInstance = instance.next()
        newInstance.hashedset.add(key)

        const { nexts, tx, atInputIndex } = await instance.methods.add(key, {
            next: {
                instance: newInstance,
                balance: instance.balance,
            },
        } as MethodCallOptions<HashedSetState>)
        console.log('HashedSetState contract called (add): ', tx.id)
        return {
            tx,
            atInputIndex,
            newInstance: nexts[0].instance,
        }
    }

    async function has(instance: HashedSetState, key: bigint) {
        const newInstance = instance.next()

        const { nexts, tx, atInputIndex } = await instance.methods.has(key, {
            next: {
                instance: newInstance,
                balance: instance.balance,
            },
        } as MethodCallOptions<HashedSetState>)
        console.log('HashedSetState contract called (has): ', tx.id)
        return {
            tx,
            atInputIndex,
            newInstance: nexts[0].instance,
        }
    }

    async function notExist(instance: HashedSetState, key: bigint) {
        const newInstance = instance.next()

        const { nexts, tx, atInputIndex } = await instance.methods.notExist(
            key,
            {
                next: {
                    instance: newInstance,
                    balance: instance.balance,
                },
            } as MethodCallOptions<HashedSetState>
        )

        console.log('HashedSetState contract called (notExist): ', tx.id)

        return {
            tx,
            atInputIndex,
            newInstance: nexts[0].instance,
        }
    }

    async function _delete(instance: HashedSetState, key: bigint) {
        const newInstance = instance.next()
        newInstance.hashedset.delete(key)

        const { nexts, tx, atInputIndex } = await instance.methods.delete(key, {
            next: {
                instance: newInstance,
                balance: instance.balance,
            },
        } as MethodCallOptions<HashedSetState>)
        console.log('HashedSetState contract called (delete): ', tx.id)

        return {
            tx,
            atInputIndex,
            newInstance: nexts[0].instance,
        }
    }

    it('add, has, delete should pass', async () => {
        await stateSet.deploy(1)

        const { newInstance: newInstance1 } = await add(stateSet, 1n)

        const { newInstance: newInstance2 } = await add(newInstance1, 2n)

        const { newInstance: newInstance3 } = await has(newInstance2, 2n)

        const { newInstance: newInstance4 } = await has(newInstance3, 1n)

        const { newInstance: newInstance5 } = await _delete(newInstance4, 2n)

        expect(await notExist(newInstance5, 2n)).not.throw
    })
})
