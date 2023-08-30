import { SmartContract, assert, method, prop } from "scrypt-ts";

export class ModExp extends SmartContract {
    // max # of bits for e = ceil(log2(y))
    static readonly N : bigint = 232n;
    // modulus
    @prop()
    readonly M : bigint;

    constructor(M : bigint){
        super(...arguments)
        this.M = M
    }
    // x^y % M
    @method()
     modExp(x : bigint, y : bigint) : bigint {
        let res : bigint = 1n;
        x = x % this.M;

        if (x != 0n) {
            for (let i = 0; i < 3; i ++) {
                if (y >= 0n) {
                    // If y is odd, multiply x with result
                    if (y % 2n) res = (res * x) % this.M;

                    // y >> 1
                    y = y / 2n;
                    x = (x * x) % this.M;
                }
            }
        }
        else {
            res = 0n;
        }

        return res;
    }

    @method()
    public main(x : bigint, y : bigint, z : bigint) {
        assert(z == this.modExp(x, y));
    }
}
