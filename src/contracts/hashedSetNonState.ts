import { method, prop, SmartContract, assert, HashedSet } from 'scrypt-ts'

/*
 * A demonstration on how to use HashedSets in a stateless contract.
 * See documentation for more details about HashedSets:
 * https://docs.scrypt.io/reference/classes/HashedSet/
 */
export class HashedSetNonState extends SmartContract {
    @prop()
    set: HashedSet<bigint>

    constructor(set: HashedSet<bigint>) {
        super(...arguments)
        this.set = set
    }

    @method()
    public add(key: bigint) {
        this.set.add(key)
        assert(this.set.has(key), 'hashedSet should have the key after add')
    }

    @method()
    public delete(key: bigint) {
        assert(this.set.has(key), 'hashedSet should have the key before delete')
        assert(this.set.delete(key), 'delete key in hashedSet failed')
        assert(
            !this.set.has(key),
            'hashedSet should not have the key after delete'
        )
    }
}
