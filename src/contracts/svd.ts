import { FixedArray, SmartContract, assert, fill, method, prop } from "scrypt-ts";

type Matrix = FixedArray<FixedArray<bigint, 4>, 4>;

// a contract using Singular Value Decomposition
// One use case could be: given a low-resolution picture, a higher-resolution picture is needed to unlock it.
// After its SVD is shown, the needed picture can be reconstructed by calculating U*Sigma*V
// A picture is represented as a matrix
export class SVD extends SmartContract{
    // lower quality approximation of the original matrix
    @prop()
    A : Matrix;

    static readonly  N : bigint = 4n;

    @prop()
    static readonly Identity : Matrix = [[1n,0n, 0n, 0n], [0n, 1n, 0n, 0n], [0n, 0n, 1n, 0n], [0n, 0n, 0n, 1n]];
  
    constructor(A : Matrix){
        super(...arguments)
        this.A = A
    }

    @method()
    public main(U : Matrix, Sigma : Matrix, V : Matrix, k : bigint) {
        // check SVD
        assert(SVD.validate(Sigma, k));
        assert(SVD.orthogonal(U));
        assert(SVD.orthogonal(V));

        // we keep the first k values in S as is and set the subsequent singular values to 0
        for (let i = 0; i < 4; i ++) {
            if (i >= k) {
                Sigma[i][i] = 0n;
            }
        }

        let product : Matrix = SVD.multiply(SVD.multiply(U, Sigma), V);
        assert(product == this.A);
    }

    // a matrix is valid if and only if all following conditions are met
    // 1) it is diagonal: all elements are 0, except on the main diagonal
    // 2) contain more than k sigular values, i.e., closer to the original matrix
    // 3) sigular values are ordered non-increasingly

    @method()
    static validate(mat : Matrix, k : bigint) : boolean {
        let result : boolean = true;

        for (let i = 0; i < 4; i ++) {
            for (let j = 0; j < 4; j ++) {
                if (j == i) {
                    if (i > 1n) {
                        // sigular values are ordered in non-increasing order
                        result = result && (mat[i][i] <= mat[i - 1][i - 1]);
                    }
                    if (i <= k) {
                        // there are over k sigular values
                        result = result && (mat[i][j] > 0n);
                    }
                }
                else {
                    // all elements not on the main diagonal are 0
                    result = result && (mat[i][j] == 0n);
                }
            }
        }

        return result;
    }

    // A * A^ = I
    @method()
    static orthogonal(mat : Matrix) : boolean {
        return SVD.multiply(mat, SVD.transpose(mat)) == SVD.Identity;
    }

    @method()
    static transpose(mat : Matrix) : Matrix {
        let mat1 : Matrix = fill(fill(0n, 4), 4);

        for (let i = 0; i < 4; i ++) {
            for (let j = 0; j < 4; j ++) {
                mat1[i][j] = mat[j][i];
            }
        }
        return mat1;
    }

    @method()
    static multiply(mat0 : Matrix, mat1 : Matrix) : Matrix {
        let mat2 : Matrix = fill(fill(0n, 4), 4);

        for (let i = 0; i < 4; i ++) {
            for (let j = 0; j < 4; j ++) {
                for (let k = 0; k < 4; k ++) {
                    mat2[i][j] += mat0[i][k] * mat1[k][j];
                }
            }
        }

        return mat2;
    }
}
