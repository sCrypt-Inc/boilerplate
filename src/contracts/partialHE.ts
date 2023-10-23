import { SmartContract, assert, method, prop } from 'scrypt-ts'
import { Point, SECP256K1 } from 'scrypt-ts-lib'

export class PartialHE extends SmartContract {
    @prop(true)
    c1: Point

    @prop(true)
    c2: Point

    constructor(c1: Point, c2: Point) {
        super(...arguments)
        this.c1 = c1
        this.c2 = c2
    }

    @method()
    public add(_c1: Point, _c2: Point) {
        this.c1 = SECP256K1.addPoints(this.c1, _c1)
        this.c2 = SECP256K1.addPoints(this.c2, _c2)
        assert(true)
    }
}
