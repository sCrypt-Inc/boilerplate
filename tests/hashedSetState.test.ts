import { expect } from 'chai'

import { HashedSetState } from '../src/contracts/hashedSetState'
import { HashedSet, MethodCallOptions } from 'scrypt-ts'
import { getDefaultSigner } from './utils/helper'

describe('Test SmartContract `HashedSetState`', () => {
    let set: HashedSet<bigint>, stateSet: HashedSetState
    before(async () => {
        await HashedSetState.compile()

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
        const deployTx = await stateSet.deploy(1)
        console.log('HashedSetState contract deployed: ', deployTx.id)

        const {
            tx: tx1,
            newInstance: newInstance1,
            atInputIndex: index1,
        } = await add(stateSet, 1n)
        let result = tx1.verifyScript(index1)
        expect(result.success, result.error).to.eq(true)

        const {
            tx: tx2,
            newInstance: newInstance2,
            atInputIndex: index2,
        } = await add(newInstance1, 2n)
        result = tx2.verifyScript(index2)
        expect(result.success, result.error).to.eq(true)

        const {
            tx: tx3,
            newInstance: newInstance3,
            atInputIndex: index3,
        } = await has(newInstance2, 2n)
        result = tx3.verifyScript(index3)
        expect(result.success, result.error).to.eq(true)

        const {
            tx: tx4,
            newInstance: newInstance4,
            atInputIndex: index4,
        } = await has(newInstance3, 1n)
        result = tx4.verifyScript(index4)
        expect(result.success, result.error).to.eq(true)

        const {
            tx: tx5,
            newInstance: newInstance5,
            atInputIndex: index5,
        } = await _delete(newInstance4, 2n)
        result = tx5.verifyScript(index5)
        expect(result.success, result.error).to.eq(true)

        const { tx: tx6, atInputIndex: index6 } = await notExist(
            newInstance5,
            2n
        )
        result = tx6.verifyScript(index6)
        expect(result.success, result.error).to.eq(true)
    })
})
