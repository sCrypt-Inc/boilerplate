import {
    FixedArray,
    SmartContract,
    assert,
    fill,
    method,
    prop,
} from 'scrypt-ts'

export class Matrix extends SmartContract {
    static readonly N = 4

    @prop()
    static readonly Identify: FixedArray<FixedArray<bigint, 4>, 4> = [
        [1n, 0n, 0n, 0n],
        [0n, 1n, 0n, 0n],
        [0n, 0n, 1n, 0n],
        [0n, 0n, 0n, 1n],
    ]

    @method()
    static multiply(
        mat0: FixedArray<FixedArray<bigint, 4>, 4>,
        mat1: FixedArray<FixedArray<bigint, 4>, 4>
    ): FixedArray<FixedArray<bigint, 4>, 4> {
        const zeroRow: FixedArray<bigint, 4> = fill(0n, 4)
        const mat2: FixedArray<FixedArray<bigint, 4>, 4> = fill(zeroRow, 4)

        for (let i: number = 0; i < 4; i++) {
            for (let j: number = 0; j < 4; j++) {
                for (let k: number = 0; k < 4; k++) {
                    mat2[i][j] += mat0[i][k] * mat1[k][j]
                }
            }
        }

        return mat2
    }

    @method()
    public main(result: FixedArray<FixedArray<bigint, 4>, 4>) {
        const mat0: FixedArray<FixedArray<bigint, 4>, 4> = [
            [1n, 1n, 1n, 1n],
            [2n, 2n, 2n, 2n],
            [3n, 3n, 3n, 3n],
            [4n, 4n, 4n, 4n],
        ]

        const mat1: FixedArray<FixedArray<bigint, 4>, 4> = [
            [1n, 1n, 1n, 1n],
            [2n, 2n, 2n, 2n],
            [3n, 3n, 3n, 3n],
            [4n, 4n, 4n, 4n],
        ]

        // A * I = A
        let mat0_ = Matrix.multiply(mat0, Matrix.Identify)
        assert(mat0_ == mat0)

        // I * A = A
        mat0_ = Matrix.multiply(Matrix.Identify, mat0)
        assert(mat0_ == mat0)

        const product = Matrix.multiply(mat0, mat1)
        const result_: FixedArray<FixedArray<bigint, 4>, 4> = [
            [10n, 10n, 10n, 10n],
            [20n, 20n, 20n, 20n],
            [30n, 30n, 30n, 30n],
            [40n, 40n, 40n, 40n],
        ]
        assert(product == result_)
        assert(product == result)
    }
}
