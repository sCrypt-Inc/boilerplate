import {
    assert,
    bsv,
    ByteString,
    int2ByteString,
    len,
    method,
    prop,
    SmartContract,
    byteString2Int,
    UTXO,
} from 'scrypt-ts'

export class Ackermann extends SmartContract {
    // Maximum number of iterations of the Ackermann function.
    // This needs to be finite due to the constraints of the Bitcoin virtual machine.
    @prop()
    static readonly LOOP_COUNT = 14n

    // Input parameters of the Ackermann function.
    @prop()
    a: bigint
    @prop()
    b: bigint

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

    // Local method to construct deployment TX.
    getDeployTx(utxos: UTXO[], initBalance: number): bsv.Transaction {
        const tx = new bsv.Transaction().from(utxos).addOutput(
            new bsv.Transaction.Output({
                script: this.lockingScript,
                satoshis: initBalance,
            })
        )
        this.from = { tx, outputIndex: 0 }
        return tx
    }

    getCallTx(y: bigint, prevTx: bsv.Transaction): bsv.Transaction {
        return new bsv.Transaction()
            .addInputFromPrevTx(prevTx)
            .setInputScript(0, () => {
                return this.getUnlockingScript((self) => self.unlock(y))
            })
    }
}
