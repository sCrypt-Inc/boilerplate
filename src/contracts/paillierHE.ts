import { SmartContract, assert, hash256, method, prop } from 'scrypt-ts'

export class PaillierHE extends SmartContract {
    // max # of bits for e = ceil(log2(n))
    // priv key: 2048 bits
    // n: 2048*2 = 4096 bits
    static readonly N = 4096

    @prop()
    nSquare: bigint

    @prop(true)
    x: bigint

    constructor(nSquare: bigint, x: bigint) {
        super(...arguments)
        this.nSquare = nSquare
        this.x = x
    }

    @method()
    public add(toAdd: bigint) {
        this.x = PaillierHE.addCT(this.x, toAdd, this.nSquare)

        const outputs =
            this.buildStateOutput(this.ctx.utxo.value) +
            this.buildChangeOutput()
        assert(hash256(outputs) == this.ctx.hashOutputs, 'hashOutputs mismatch')
    }

    @method()
    public mul(factor: bigint) {
        this.x = PaillierHE.mulCT(this.x, factor, this.nSquare)

        const outputs =
            this.buildStateOutput(this.ctx.utxo.value) +
            this.buildChangeOutput()
        assert(hash256(outputs) == this.ctx.hashOutputs, 'hashOutputs mismatch')
    }

    @method()
    static addCT(ct0: bigint, ct1: bigint, nSquare: bigint): bigint {
        return (ct0 * ct1) % nSquare
    }

    @method()
    static mulCT(ct0: bigint, k: bigint, nSquare: bigint): bigint {
        return PaillierHE.modExp(ct0, k, nSquare)
    }

    // x^y % m
    @method()
    static modExp(x: bigint, y: bigint, m: bigint): bigint {
        let res: bigint = 1n
        x = x % m

        if (x != 0n) {
            for (let i = 0; i < PaillierHE.N; i++) {
                if (y >= 0n) {
                    // If y is odd, multiply x with result
                    if (y % 2n) res = (res * x) % m

                    // y >> 1
                    y = y / 2n
                    x = (x * x) % m
                }
            }
        } else {
            res = 0n
        }

        return res
    }
}
