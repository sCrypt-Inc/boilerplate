import { method, prop, SmartContract, assert } from "scrypt-ts";
import { bsv } from 'scryptlib';
import { createInputFromPrevTx, fetchUtxos, newTx, signAndSend } from '../txHelper';

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

    @method
    sum(a: bigint, b: bigint): bigint {
        return a + b;
    }

    @method
    public add(z: bigint) {
        assert(z == this.sum(this.x, this.y));
    }

    @method
    public sub(z: bigint) {
      assert(z == this.x - this.y);
    }

    async deploy(satoshis: number) {

        const tx = newTx(await fetchUtxos());

        tx.addOutput(new bsv.Transaction.Output({
          script: this.lockingScript,
          satoshis: satoshis,
        }));

        return signAndSend(tx);
    }


    async call(z: bigint, prevTx: bsv.Transaction) {

        let tx: bsv.Transaction = new bsv.Transaction()
        .addInput(createInputFromPrevTx(prevTx))
        .setInputScript(0, (tx: bsv.Transaction, prevOutput: bsv.Transaction.Output) => {
          return this.getUnlockingScript(() => {
            // call previous demo's public method to get the unlocking script.
            this.add(z)
          })
        })


        return signAndSend(tx);
    }
}