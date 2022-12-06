import { method, SmartContract, assert, SigHashPreimage, bsv, SigHash, len, unpack, num2bin, Utils, hash256, prop } from "scrypt-ts";
import { UTXO } from "../types";

export class Counter extends SmartContract {

    @prop()
    static readonly DataLen: number = 1;


    @method
    public increment(txPreimage: SigHashPreimage, amount: bigint) {

        assert(this.checkPreimage(txPreimage));

        // deserialize state (i.e., counter value)
        let scriptCode: string = SigHash.scriptCode(txPreimage);

        //console.log("txPreimage", txPreimage.toJSONObject())
        let scriptLen: number = len(scriptCode);
        // counter is at the end
        let counter: bigint = unpack(scriptCode.slice((scriptLen - Counter.DataLen) * 2, scriptLen * 2));

        // increment counter
        counter++;

        // serialize state
        let outputScript: string = scriptCode.slice(0, (scriptLen - Counter.DataLen) * 2) + num2bin(counter, BigInt(Counter.DataLen));


        let output: string = Utils.buildOutput(outputScript, amount);

        assert(hash256(output) == SigHash.hashOutputs(txPreimage));

    }

    getDeployTx(utxos: UTXO[], initBalance: number): bsv.Transaction {
        this.setDataPartInASM(num2bin(BigInt(0), 1n));
        const tx = new bsv.Transaction().from(utxos)
            .addOutput(new bsv.Transaction.Output({
                script: this.lockingScript,
                satoshis: initBalance,
            }));
        this.lockTo = { tx, outputIndex: 0 };
        return tx;
    }


    getCallTx(prevTx: bsv.Transaction, nextInst: Counter): bsv.Transaction {
        const inputIndex = 0;
        return new bsv.Transaction()
            .addInputFromPrevTx(prevTx)
            .setOutput(0, (tx: bsv.Transaction) => {
                nextInst.lockTo = { tx, outputIndex: 0 };
                return new bsv.Transaction.Output({
                    script: nextInst.lockingScript,
                    satoshis: tx.inputAmount - tx.getEstimateFee(),
                })
            })
            .setInputScript(inputIndex, (tx: bsv.Transaction) => {
                this.unlockFrom = { tx, inputIndex };
                return this.getUnlockingScript(self => {
                    self.increment(new SigHashPreimage(tx.getPreimage(inputIndex)), BigInt(tx.getOutputAmount(0)));
                })
            });
    }
}