import { SmartContract, assert, method, prop } from 'scrypt-ts'
import { Point, SECP256K1 } from 'scrypt-ts-lib'

export type CT = {
    c1: Point
    c2: Point
}

export class PartialHE extends SmartContract {
    @prop(true)
    salarySum: CT

    constructor(salarySum: CT) {
        super(...arguments)
        this.salarySum = salarySum
    }

    @method()
    public add(toAdd: CT) {
        this.salarySum = PartialHE.addCT(this.salarySum, toAdd)
        assert(true)
    }

    @method()
    static addCT(ct0: CT, ct1: CT): CT {
        const res: CT = {
            c1: SECP256K1.addPoints(ct0.c1, ct1.c1),
            c2: SECP256K1.addPoints(ct0.c2, ct1.c2),
        }
        return res
    }
}
