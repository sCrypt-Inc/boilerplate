import { SmartContract, SmartContractLib, method, assert } from 'scrypt-ts'

type Fraction = {
    n: bigint // numerator
    d: bigint // denominator
}

export class FRMath extends SmartContractLib {
    @method()
    static add(x: Fraction, y: Fraction): Fraction {
        return {
            n: x.n * y.d + y.n * x.d,
            d: x.d * y.d,
        }
    }

    @method()
    static sAdd(x: Fraction, y: Fraction): Fraction {
        assert(x.d > 0n && y.d > 0n)
        return {
            n: x.n * y.d + y.n * x.d,
            d: x.d * y.d,
        }
    }

    @method()
    static sub(x: Fraction, y: Fraction): Fraction {
        return {
            n: x.n * y.d - y.n * x.d,
            d: x.d * y.d,
        }
    }

    @method()
    static sSub(x: Fraction, y: Fraction): Fraction {
        assert(x.d > 0n && y.d > 0n)
        return {
            n: x.n * y.d - y.n * x.d,
            d: x.d * y.d,
        }
    }

    @method()
    static mul(x: Fraction, y: Fraction): Fraction {
        return {
            n: x.n * y.n,
            d: x.d * y.d,
        }
    }

    @method()
    static sMul(x: Fraction, y: Fraction): Fraction {
        assert(x.d > 0n && y.d > 0n)
        return {
            n: x.n * y.n,
            d: x.d * y.d,
        }
    }

    @method()
    static div(x: Fraction, y: Fraction): Fraction {
        return {
            n: x.n * y.d,
            d: x.d * y.n,
        }
    }

    @method()
    static sDiv(x: Fraction, y: Fraction): Fraction {
        assert(x.d > 0n && y.d > 0n && y.n != 0n)
        return {
            n: x.n * y.d,
            d: x.d * y.n,
        }
    }

    @method()
    static abs(x: Fraction): Fraction {
        return {
            n: x.n >= 0n ? x.n : -x.n,
            d: x.d >= 0n ? x.d : -x.d,
        }
    }

    @method()
    static sAbs(x: Fraction): Fraction {
        const absoluteN = FRMath.abs({ n: x.n, d: 1n }).n // Use abs to calculate the absolute value of x.n
        // Do something with absoluteN...
        return {
            n: absoluteN,
            d: x.d,
        }
    }

    @method()
    static equal(x: Fraction, y: Fraction): boolean {
        return FRMath.sub(x, y).n == 0n
    }

    @method()
    static sEqual(x: Fraction, y: Fraction): boolean {
        return FRMath.sSub(x, y).n == 0n
    }

    @method()
    static toInt(x: Fraction): bigint {
        return x.n / x.d
    }

    @method()
    static scaleUp(x: Fraction, s: bigint): bigint {
        return (x.n * s) / x.d
    }
}

export class FRMathTest extends SmartContract {
    @method()
    runOp(op: bigint, x: Fraction, y: Fraction): Fraction {
        let r: Fraction = { n: 0n, d: 1n }
        if (op == 0n) {
            r = FRMath.add(x, y)
        } else if (op == 1n) {
            r = FRMath.sub(x, y)
        } else if (op == 2n) {
            r = FRMath.mul(x, y)
        } else if (op == 3n) {
            r = FRMath.div(x, y)
        } else if (op == 4n) {
            r = FRMath.abs(x)
        }
        return r
    }

    @method()
    runSafeOp(op: bigint, x: Fraction, y: Fraction): Fraction {
        let r: Fraction = { n: 0n, d: 1n }
        if (op == 0n) {
            r = FRMath.sAdd(x, y)
        } else if (op == 1n) {
            r = FRMath.sSub(x, y)
        } else if (op == 2n) {
            r = FRMath.sMul(x, y)
        } else if (op == 3n) {
            r = FRMath.sDiv(x, y)
        } else if (op == 4n) {
            r = FRMath.sAbs(x)
        }
        return r
    }

    @method()
    public unlock(
        x: Fraction,
        y: Fraction,
        z: Fraction,
        op: bigint,
        strict: boolean
    ) {
        let r: Fraction = { n: 0n, d: 1n }
        if (strict) {
            r = this.runSafeOp(op, x, y)
            assert(FRMath.sEqual(r, z))
        } else {
            r = this.runOp(op, x, y)
            assert(FRMath.equal(r, z))
        }
        assert(true)
    }

    @method()
    public unlockScaled(
        s: bigint,
        x: Fraction,
        y: Fraction,
        op: bigint,
        strict: boolean,
        sr: bigint
    ) {
        let r: Fraction = { n: 0n, d: 1n }
        if (strict) {
            r = this.runSafeOp(op, x, y)
        } else {
            r = this.runOp(op, x, y)
        }
        assert(true)
    }
}
