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

        // 1. Get the available utxos for the privatekey
        const utxos = await fetchUtxos();

        // 2. Construct a transaction: the input of which is the acquired utxos, and the first output of the transaction contains the lockingScript corresponding to the Demo contract
        const tx = newTx(utxos);
        tx.addOutput(new bsv.Transaction.Output({
            script: this.lockingScript,
            satoshis: satoshis,
        }));

        // 3. Sign and broadcast transaction with privatekey
        return signAndSend(tx);
    }


    async callAdd(z: bigint, prevTx: bsv.Transaction) {

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