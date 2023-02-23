import {
    method,
    prop,
    SmartContract,
    assert,
    hash256,
    HashedSet,
    SigHash,
} from 'scrypt-ts'

export class HashedSetState extends SmartContract {
    @prop(true)
    hashedset: HashedSet<bigint>

    constructor(hashedset: HashedSet<bigint>) {
        super(hashedset)
        this.hashedset = hashedset
    }

    @method(SigHash.SINGLE)
    public add(key: bigint) {
        this.hashedset.add(key)
        assert(
            this.ctx.hashOutputs ==
                hash256(this.buildStateOutput(this.ctx.utxo.value))
        )
    }

    @method(SigHash.SINGLE)
    public has(key: bigint) {
        assert(this.hashedset.has(key))
        assert(
            this.ctx.hashOutputs ==
                hash256(this.buildStateOutput(this.ctx.utxo.value))
        )
    }

    @method(SigHash.SINGLE)
    public notExist(key: bigint) {
        assert(!this.hashedset.has(key))
        assert(
            this.ctx.hashOutputs ==
                hash256(this.buildStateOutput(this.ctx.utxo.value))
        )
    }

    @method(SigHash.SINGLE)
    public delete(key: bigint) {
        assert(this.hashedset.delete(key))
        assert(
            this.ctx.hashOutputs ==
                hash256(this.buildStateOutput(this.ctx.utxo.value))
        )
    }
}
