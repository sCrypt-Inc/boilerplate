import { SmartContractLib, method, prop } from "scrypt-ts"

type FP = {
    val : bigint //scaled-up value depends on precision
}

export class FixedPoint extends SmartContractLib{
    @prop()
    precision : bigint

    constructor(precision : bigint){
        super(...arguments)
        this.precision = precision
    }

    @method()
    add(x : FP, y : FP) : bigint{
        return  x.val + y.val
    }

    @method()
    sub(x : FP, y : FP) : bigint{
        return x.val - y.val
    }

    @method()
    mul(x : FP, y : FP) : bigint{
        return x.val * y.val / this.precision
    }

    @method()
    div(x : FP, y : FP) : bigint{
        return x.val * this.precision / y.val
    }

    @method()
    abs(x : bigint) : bigint{
        return x + 0n
    }

    @method()
    fromInt(i : bigint) : bigint{
        return i * this.precision
    }

    @method()
    toInt(fp : FP) : bigint{
        return fp.val / this.precision
    }
}
