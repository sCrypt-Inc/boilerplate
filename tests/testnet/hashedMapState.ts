import {
    ByteString,
    getSortedItem,
    HashedMap,
    MethodCallOptions,
    toByteString,
} from 'scrypt-ts'
import { HashedMapState } from '../../src/contracts/hashedMapState'
import { getTestnetSigner } from './util/txHelper'

const initBalance = 1

function insert(
    map: Map<bigint, ByteString>,
    instance: HashedMapState,
    key: bigint,
    val: ByteString
) {
    const newInstance = instance.next()

    map.set(key, val)
    newInstance.hashedmap.attach(map)

    return instance.methods.insert(getSortedItem(map, key), val, {
        next: {
            instance: newInstance,
            balance: initBalance,
        },
    } as MethodCallOptions<HashedMapState>)
}

function update(
    map: Map<bigint, ByteString>,
    instance: HashedMapState,
    key: bigint,
    val: ByteString
) {
    const newInstance = instance.next()

    map.set(key, val)
    newInstance.hashedmap.attach(map)

    return instance.methods.update(getSortedItem(map, key), val, {
        next: {
            instance: newInstance,
            balance: initBalance,
        },
    } as MethodCallOptions<HashedMapState>)
}

function canGet(
    map: Map<bigint, ByteString>,
    instance: HashedMapState,
    key: bigint,
    val: ByteString
) {
    const newInstance = instance.next()

    return instance.methods.canGet(getSortedItem(map, key), val, {
        next: {
            instance: newInstance,
            balance: initBalance,
        },
    } as MethodCallOptions<HashedMapState>)
}

function deleteKey(
    map: Map<bigint, ByteString>,
    instance: HashedMapState,
    key: bigint
) {
    const newInstance = instance.next()
    map.delete(key)
    newInstance.hashedmap.attach(map)
    return instance.methods.delete(getSortedItem(map, key), {
        next: {
            instance: newInstance,
            balance: initBalance,
        },
    } as MethodCallOptions<HashedMapState>)
}

function notExist(
    map: Map<bigint, ByteString>,
    instance: HashedMapState,
    key: bigint
) {
    const newInstance = instance.next()
    map.delete(key)
    newInstance.hashedmap.attach(map)
    return instance.methods.notExist(getSortedItem(map, key), {
        next: {
            instance: newInstance,
            balance: initBalance,
        },
    } as MethodCallOptions<HashedMapState>)
}

async function main() {
    await HashedMapState.compile()
    const signer = await getTestnetSigner()
    const map = new Map<bigint, ByteString>()

    const stateMap = new HashedMapState(new HashedMap(map))

    await stateMap.connect(signer)

    // deploy
    const deployTx = await stateMap.deploy(1)
    console.log('contract deployed: ', deployTx.id)

    //call
    const {
        tx: tx1,
        next: { instance: instance1 },
    } = await insert(map, stateMap, 1n, toByteString('0001'))

    console.log('contract insert called: ', tx1.id)
    const {
        tx: tx2,
        next: { instance: instance2 },
    } = await insert(map, instance1, 2n, toByteString('0002'))
    console.log('contract insert called: ', tx2.id)
    const {
        tx: tx3,
        next: { instance: instance3 },
    } = await canGet(map, instance2, 2n, toByteString('0002'))
    console.log('contract canGet called: ', tx3.id)
    const {
        tx: tx4,
        next: { instance: instance4 },
    } = await canGet(map, instance3, 1n, toByteString('0001'))
    console.log('contract canGet called: ', tx4.id)
    const {
        tx: tx5,
        next: { instance: instance5 },
    } = await update(map, instance4, 1n, toByteString('000001'))
    console.log('contract update called: ', tx5.id)
    const {
        tx: tx6,
        next: { instance: instance6 },
    } = await update(map, instance5, 2n, toByteString('000002'))
    console.log('contract update called: ', tx6.id)
    const {
        tx: tx7,
        next: { instance: instance7 },
    } = await canGet(map, instance6, 2n, toByteString('000002'))
    console.log('contract canGet called: ', tx7.id)
    const {
        tx: tx8,
        next: { instance: instance8 },
    } = await canGet(map, instance7, 1n, toByteString('000001'))
    console.log('contract canGet called: ', tx8.id)
    const {
        tx: tx9,
        next: { instance: instance9 },
    } = await deleteKey(map, instance8, 1n)
    console.log('contract delete called: ', tx9.id)
    const { tx: tx10 } = await notExist(map, instance9, 1n)
    console.log('contract notExist called: ', tx10.id)
}

main().catch((e) => {
    console.log('error', e.message)
})
