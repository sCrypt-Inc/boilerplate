import {
    method,
    prop,
    SmartContract,
    assert,
    HashedMap,
    ByteString,
} from 'scrypt-ts'

type MyMap = HashedMap<bigint, ByteString>

export class HashedMapNonState extends SmartContract {
    @prop()
    map: MyMap

    constructor(map: MyMap) {
        super(map)
        this.map = map
    }

    @method()
    public unlock(key: bigint, val: ByteString) {
        this.map.set(key, val)

        for (let i = 0; i < 4; i++) {
            if (i < 2) {
                this.map.set(key + BigInt(i), val)
                assert(this.map.has(key + BigInt(i)))
            } else {
                this.map.set(key * 2n + BigInt(i), val)
            }
        }

        assert(
            this.map.canGet(key, val),
            'cannot get key-value pair from hashedMap'
        )
        assert(
            this.map.canGet(key * 2n + 2n, val),
            'cannot get key-value pair from hashedMap'
        )
        assert(this.map.size >= 5)
        assert(true)
    }

    @method()
    public delete(key: bigint) {
        assert(this.map.has(key), 'hashedMap should have the key before delete')
        assert(this.map.delete(key), 'delete key in hashedMap failed')
        assert(
            !this.map.has(key),
            'hashedMap should not have the key after delete'
        )
        assert(true)
    }
}
