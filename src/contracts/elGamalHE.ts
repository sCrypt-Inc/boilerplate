import { SmartContract, assert, hash256, method, prop } from 'scrypt-ts'
import { Point, SECP256K1 } from 'scrypt-ts-lib'

export type CT = {
    c1: Point
    c2: Point
}

export class ElGamalHE extends SmartContract {
    @prop(true)
    expenseSum: CT

    constructor(salarySum: CT) {
        super(...arguments)
        this.expenseSum = salarySum
    }

    @method()
    public add(toAdd: CT) {
        // Add encrypted value to the total sum.
        this.expenseSum = ElGamalHE.addCT(this.expenseSum, toAdd)

        const outputs =
            this.buildStateOutput(this.ctx.utxo.value) +
            this.buildChangeOutput()
        assert(hash256(outputs) == this.ctx.hashOutputs, 'hashOutputs mismatch')
    }

    // Add homomorphicly.
    @method()
    static addCT(ct0: CT, ct1: CT): CT {
        const res: CT = {
            c1: SECP256K1.addPoints(ct0.c1, ct1.c1),
            c2: SECP256K1.addPoints(ct0.c2, ct1.c2),
        }
        return res
    }
}
