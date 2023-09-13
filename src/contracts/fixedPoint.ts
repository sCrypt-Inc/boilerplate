import {
    SmartContractLib,
    method,
    prop,
    assert,
    SmartContract,
} from 'scrypt-ts'

type FP = {
    val: bigint //scaled-up value depends on precision
}

export class FixedPoint extends SmartContractLib {
    @prop()
    precision: bigint

    constructor(precision: bigint) {
        super(...arguments)
        this.precision = precision
    }

    @method()
    add(x: FP, y: FP): bigint {
        return x.val + y.val
    }

    @method()
    sub(x: FP, y: FP): bigint {
        return x.val - y.val
    }

    @method()
    mul(x: FP, y: FP): bigint {
        return (x.val * y.val) / this.precision
    }

    @method()
    div(x: FP, y: FP): bigint {
        return (x.val * this.precision) / y.val
    }

    @method()
    abs(x: bigint): bigint {
        return x + 0n
    }

    @method()
    fromInt(i: bigint): bigint {
        return i * this.precision
    }

    @method()
    toInt(fp: FP): bigint {
        return fp.val / this.precision
    }
}

export class FPTest extends SmartContract {
    @method()
    public unlock(
        precision: bigint,
        x: bigint,
        y: bigint,
        op: bigint,
        r: bigint
    ) {
        const fp: FixedPoint = new FixedPoint(precision)
        let result = fp.fromInt(0n)
        const fpX: FP = { val: x }
        const fpY: FP = { val: y }
        if (op == 0n) {
            result = fp.add(fpX, fpY)
        } else if (op == 1n) {
            result = fp.sub(fpX, fpY)
        } else if (op == 2n) {
            result = fp.mul(fpX, fpY)
        } else if (op == 3n) {
            result = fp.div(fpX, fpY)
        } else if (op == 4n) {
            result = fp.abs(fpX.val)
        }
        assert(result == r)
        assert(fp.toInt({ val: result }) == r / precision)
    }
}
