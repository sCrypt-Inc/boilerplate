import { method, prop, SmartContract, assert, num2bin, len, unpack, bsv } from "scrypt-ts";
import { UTXO } from "../types";


export class Ackermann extends SmartContract {

    @prop()
    a: bigint;

    @prop()
    b: bigint;

    static readonly LOOPCOUNT: number = 14;


    constructor(a: bigint, b: bigint) {
        super(a, b);
        this.a = a;
        this.b = b;
    }

    @method
    ackermann(m: bigint, n: bigint): bigint {

        let stk: string = num2bin(m, 1n);

        for (let i = 0; i < Ackermann.LOOPCOUNT; i++) {
            if (len(stk) > 0) {
                let top: string = stk.slice(0, 2);
                m = unpack(top);

                // pop
                stk = stk.slice(2, len(stk) * 2);

                if (m == 0n) {
                    n = n + m + 1n;
                }
                else if (n == 0n) {
                    n++;
                    m--;
                    // push
                    stk = num2bin(m, 1n) + stk;
                }
                else {
                    stk = num2bin(m - 1n, 1n) + stk;
                    stk = num2bin(m, 1n) + stk;
                    n--;
                }
            }
        }

        return n;

    }

    // y = 5
    @method
    public unlock(y: bigint) {
        assert(y == this.ackermann(this.a, this.b));
    }

    getDeployTx(utxos: UTXO[], initBalance: number): bsv.Transaction {
        const tx = new bsv.Transaction().from(utxos)
            .addOutput(new bsv.Transaction.Output({
                script: this.lockingScript,
                satoshis: initBalance,
            }));
        this.lockTo = { tx, outputIndex: 0 };
        return tx;
    }

    getCallTx(y: bigint, prevTx: bsv.Transaction): bsv.Transaction {
        return new bsv.Transaction()
            .addInputFromPrevTx(prevTx)
            .setInputScript(0, () => {
                return this.getUnlockingScript(self => self.unlock(y));
            })
    }

}