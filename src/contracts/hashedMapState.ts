import {
    assert,
    ByteString,
    hash256,
    HashedMap,
    int2ByteString,
    method,
    prop,
    SigHash,
    SmartContract,
} from 'scrypt-ts'

/*
 * A demonstration on how to use HashedMaps in a stateful contract.
 * Using method calls we can update the hashed map, which the contract
 * keeps track of.
 * See documentation for more details about HashedMaps:
 * https://docs.scrypt.io/reference/classes/HashedMap/
 */
export class HashedMapState extends SmartContract {
    @prop(true)
    hashedmap: HashedMap<bigint, ByteString>

    constructor(hashedmap: HashedMap<bigint, ByteString>) {
        super(...arguments)
        this.hashedmap = hashedmap
    }

    @method(SigHash.SINGLE)
    public insert(key: bigint, val: ByteString) {
        this.hashedmap.set(key, val)
        assert(
            this.ctx.hashOutputs ==
                hash256(this.buildStateOutput(this.ctx.utxo.value)),
            'hashOutputs check failed'
        )
    }

    @method(SigHash.SINGLE)
    public canGet(key: bigint, val: ByteString) {
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
    public notExist(key: bigint) {
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
    public update(key: bigint, val: ByteString) {
        this.hashedmap.set(key, val)
        assert(
            this.ctx.hashOutputs ==
                hash256(this.buildStateOutput(this.ctx.utxo.value)),
            'hashOutputs check failed'
        )
    }

    @method(SigHash.SINGLE)
    public delete(key: bigint) {
        assert(this.hashedmap.delete(key), 'delete key from hashedMap failed')
        assert(
            this.ctx.hashOutputs ==
                hash256(this.buildStateOutput(this.ctx.utxo.value))
        )
    }

    @method(SigHash.SINGLE)
    public unlock(key: bigint, val: ByteString) {
        for (let i = 0; i < 5; i++) {
            this.hashedmap.set(BigInt(i), int2ByteString(BigInt(i), BigInt(i)))
        }

        for (let i = 0; i < 5; i++) {
            assert(
                this.hashedmap.canGet(
                    BigInt(i),
                    int2ByteString(BigInt(i), BigInt(i))
                ),
                `canGet failed`
            )

            if (i === 3) {
                assert(
                    this.hashedmap.delete(key),
                    'delete key from hashedMap failed'
                )
            } else if (i == 4) {
                this.hashedmap.set(key, val)
            }
        }

        assert(
            this.ctx.hashOutputs ==
                hash256(this.buildStateOutput(this.ctx.utxo.value))
        )
    }
}
