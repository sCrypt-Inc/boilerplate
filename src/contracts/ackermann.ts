import {
    assert,
    ByteString,
    byteString2Int,
    int2ByteString,
    len,
    method,
    prop,
    SmartContract,
} from 'scrypt-ts'

export class Ackermann extends SmartContract {
    // Maximum number of iterations of the Ackermann function.
    // This needs to be finite due to the constraints of the Bitcoin virtual machine.
    static readonly LOOP_COUNT = 14n

    // Input parameters of the Ackermann function.
    @prop()
    readonly a: bigint
    @prop()
    readonly b: bigint

    constructor(a: bigint, b: bigint) {
        super(...arguments)
        this.a = a
        this.b = b
    }

    @method()
    ackermann(m: bigint, n: bigint): bigint {
        let stk: ByteString = int2ByteString(m, 1n)

        for (let i = 0; i < Ackermann.LOOP_COUNT; i++) {
            if (len(stk) > 0) {
                const top: ByteString = stk.slice(0, 2)
                m = byteString2Int(top)

                // pop
                stk = stk.slice(2, len(stk) * 2)

                if (m == 0n) {
                    n = n + m + 1n
                } else if (n == 0n) {
                    n++
                    m--
                    // push
                    stk = int2ByteString(m, 1n) + stk
                } else {
                    stk = int2ByteString(m - 1n, 1n) + stk
                    stk = int2ByteString(m, 1n) + stk
                    n--
                }
            }
        }

        return n
    }

    // This method can only be unlocked if the right solution to ackermann(a, b) is provided.
    @method()
    public unlock(y: bigint) {
        assert(y == this.ackermann(this.a, this.b), 'Wrong solution.')
    }
}
