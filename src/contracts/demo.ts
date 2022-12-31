import { method, prop, SmartContract, assert, bsv } from "scrypt-ts";
import { UTXO } from "../types";

export class Demo extends SmartContract {

    @prop()
    x: bigint;

    @prop()
    y: bigint;

    constructor(x: bigint, y: bigint) {
        super(x, y);
        this.x = x;
        this.y = y;
    }

    @method()
    sum(a: bigint, b: bigint): bigint {
        return a + b;
    }

    @method()
    public add(z: bigint) {
        assert(z == this.sum(this.x, this.y));
    }

    @method()
    public sub(z: bigint) {
        assert(z == this.x - this.y);
    }

    getDeployTx(utxos: UTXO[], satoshis: number): bsv.Transaction {
        return new bsv.Transaction().from(utxos)
            .addOutput(new bsv.Transaction.Output({
                script: this.lockingScript,
                satoshis: satoshis,
            }))
    }

    getCallTxForAdd(z: bigint, prevTx: bsv.Transaction): bsv.Transaction {
        return new bsv.Transaction()
            .addInputFromPrevTx(prevTx)
            .setInputScript(0, () => {
                return this.getUnlockingScript(self => self.add(z));
            })
    }
}