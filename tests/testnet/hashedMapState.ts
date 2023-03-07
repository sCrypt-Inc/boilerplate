import {
    ByteString,
    HashedMap,
    MethodCallOptions,
    toByteString,
} from 'scrypt-ts'
import { HashedMapState } from '../../src/contracts/hashedMapState'
import { getDefaultSigner } from '../utils/helper'

const initBalance = 1

function insert(instance: HashedMapState, key: bigint, val: ByteString) {
    const newInstance = instance.next()

    newInstance.hashedmap.set(key, val)

    return instance.methods.insert(key, val, {
        next: {
            instance: newInstance,
            balance: initBalance,
        },
    } as MethodCallOptions<HashedMapState>)
}

function update(instance: HashedMapState, key: bigint, val: ByteString) {
    const newInstance = instance.next()

    newInstance.hashedmap.set(key, val)

    return instance.methods.update(key, val, {
        next: {
            instance: newInstance,
            balance: initBalance,
        },
    } as MethodCallOptions<HashedMapState>)
}

function canGet(instance: HashedMapState, key: bigint, val: ByteString) {
    const newInstance = instance.next()

    return instance.methods.canGet(key, val, {
        next: {
            instance: newInstance,
            balance: initBalance,
        },
    } as MethodCallOptions<HashedMapState>)
}

function deleteKey(instance: HashedMapState, key: bigint) {
    const newInstance = instance.next()
    newInstance.hashedmap.delete(key)
    return instance.methods.delete(key, {
        next: {
            instance: newInstance,
            balance: initBalance,
        },
    } as MethodCallOptions<HashedMapState>)
}

function notExist(instance: HashedMapState, key: bigint) {
    const newInstance = instance.next()
    newInstance.hashedmap.delete(key)
    return instance.methods.notExist(key, {
        next: {
            instance: newInstance,
            balance: initBalance,
        },
    } as MethodCallOptions<HashedMapState>)
}

async function main() {
    await HashedMapState.compile()
    const signer = getDefaultSigner()
    const map = new HashedMap<bigint, ByteString>()

    const stateMap = new HashedMapState(map)

    await stateMap.connect(signer)

    // deploy
    const deployTx = await stateMap.deploy(1)
    console.log('contract deployed: ', deployTx.id)

    //call
    const {
        tx: tx1,
        next: { instance: instance1 },
    } = await insert(stateMap, 1n, toByteString('0001'))

    console.log('contract insert called: ', tx1.id)
    const {
        tx: tx2,
        next: { instance: instance2 },
    } = await insert(instance1, 2n, toByteString('0002'))
    console.log('contract insert called: ', tx2.id)
    const {
        tx: tx3,
        next: { instance: instance3 },
    } = await canGet(instance2, 2n, toByteString('0002'))
    console.log('contract canGet called: ', tx3.id)
    const {
        tx: tx4,
        next: { instance: instance4 },
    } = await canGet(instance3, 1n, toByteString('0001'))
    console.log('contract canGet called: ', tx4.id)
    const {
        tx: tx5,
        next: { instance: instance5 },
    } = await update(instance4, 1n, toByteString('000001'))
    console.log('contract update called: ', tx5.id)
    const {
        tx: tx6,
        next: { instance: instance6 },
    } = await update(instance5, 2n, toByteString('000002'))
    console.log('contract update called: ', tx6.id)
    const {
        tx: tx7,
        next: { instance: instance7 },
    } = await canGet(instance6, 2n, toByteString('000002'))
    console.log('contract canGet called: ', tx7.id)
    const {
        tx: tx8,
        next: { instance: instance8 },
    } = await canGet(instance7, 1n, toByteString('000001'))
    console.log('contract canGet called: ', tx8.id)
    const {
        tx: tx9,
        next: { instance: instance9 },
    } = await deleteKey(instance8, 1n)
    console.log('contract delete called: ', tx9.id)
    const { tx: tx10 } = await notExist(instance9, 1n)
    console.log('contract notExist called: ', tx10.id)
}

describe('Test SmartContract `HashedMapState` on testnet', () => {
    it('should succeed', async () => {
        await main()
    })
})
