import {
    assert,
    ByteString,
    hash256,
    HashedMap,
    method,
    prop,
    SigHash,
    SmartContract,
    SortedItem,
} from 'scrypt-ts'

export class HashedMapState extends SmartContract {
    @prop(true)
    hashedmap: HashedMap<bigint, ByteString>

    constructor(hashedmap: HashedMap<bigint, ByteString>) {
        super(hashedmap)
        this.hashedmap = hashedmap
    }

    @method(SigHash.SINGLE)
    public insert(key: SortedItem<bigint>, val: ByteString) {
        assert(
            this.hashedmap.set(key, val),
            'set key-value pair into hashedMap failed'
        )
        assert(
            this.ctx.hashOutputs ==
                hash256(this.buildStateOutput(this.ctx.utxo.value)),
            'hashOutputs check failed'
        )
    }

    @method(SigHash.SINGLE)
    public canGet(key: SortedItem<bigint>, val: ByteString) {
        assert(this.hashedmap.has(key), `hashedMap does not have key: ${key}`)
        assert(
            this.hashedmap.canGet(key, val),
            `can not get key-value pair: ${key}-${val}`
        )
        assert(
            this.ctx.hashOutputs ==
                hash256(this.buildStateOutput(this.ctx.utxo.value)),
            'hashOutputs check failed'
        )
    }

    @method(SigHash.SINGLE)
    public notExist(key: SortedItem<bigint>) {
        assert(
            !this.hashedmap.has(key),
            `key: ${key} should not exist in hashedmap`
        )
        assert(
            this.ctx.hashOutputs ==
                hash256(this.buildStateOutput(this.ctx.utxo.value)),
            'hashOutputs check failed'
        )
    }

    @method(SigHash.SINGLE)
    public update(key: SortedItem<bigint>, val: ByteString) {
        assert(
            this.hashedmap.set(key, val),
            'set key-value pair into hashedMap failed'
        )
        assert(
            this.ctx.hashOutputs ==
                hash256(this.buildStateOutput(this.ctx.utxo.value)),
            'hashOutputs check failed'
        )
    }

    @method(SigHash.SINGLE)
    public delete(key: SortedItem<bigint>) {
        assert(this.hashedmap.delete(key), 'delete key from hashedMap failed')
        assert(
            this.ctx.hashOutputs ==
                hash256(this.buildStateOutput(this.ctx.utxo.value))
        )
    }
}
