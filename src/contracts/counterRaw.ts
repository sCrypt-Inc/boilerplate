import {assert, bsv, ByteString, hash256, int2str, len, method, prop, SigHash, SigHashPreimage, SmartContract, unpack, Utils} from "scrypt-ts";
import {UTXO} from "../types";

export class Counter extends SmartContract {

    @prop()
    static readonly DATA_LEN: number = 1;

    @method()
    public increment(txPreimage: SigHashPreimage, amount: bigint) {

        assert(this.checkPreimage(txPreimage), 'preimage check failed');

        // deserialize state (i.e., counter value)
        let scriptCode: ByteString = SigHash.scriptCode(txPreimage);

        //console.log("txPreimage", txPreimage.toJSONObject())
        let scriptLen: number = len(scriptCode);
        // counter is at the end
        let counter: bigint = unpack(scriptCode.slice((scriptLen - Counter.DATA_LEN) * 2, scriptLen * 2));

        // increment counter
        counter++;

        // serialize state
        let outputScript: ByteString = scriptCode.slice(0, (scriptLen - Counter.DATA_LEN) * 2) + int2str(counter, BigInt(Counter.DATA_LEN));

        let output: ByteString = Utils.buildOutput(outputScript, amount);

        assert(hash256(output) == SigHash.hashOutputs(txPreimage), 'hashOutput check failed');
    }

    getDeployTx(utxos: UTXO[], initBalance: number): bsv.Transaction {
        this.setDataPartInASM(int2str(BigInt(0), 1n));
        const tx = new bsv.Transaction().from(utxos)
            .addOutput(new bsv.Transaction.Output({
                script: this.lockingScript,
                satoshis: initBalance,
            }));
        this.lockTo = {tx, outputIndex: 0};
        return tx;
    }

    getCallTx(prevTx: bsv.Transaction, nextInst: Counter): bsv.Transaction {
        const inputIndex = 0;
        return new bsv.Transaction()
            .addInputFromPrevTx(prevTx)
            .setOutput(0, (tx: bsv.Transaction) => {
                nextInst.lockTo = {tx, outputIndex: 0};
                return new bsv.Transaction.Output({
                    script: nextInst.lockingScript,
                    satoshis: tx.inputAmount - tx.getEstimateFee(),
                })
            })
            .setInputScript(inputIndex, (tx: bsv.Transaction) => {
                this.unlockFrom = {tx, inputIndex};
                return this.getUnlockingScript(self => {
                    self.increment(SigHashPreimage(tx.getPreimage(inputIndex)), BigInt(tx.getOutputAmount(0)));
                })
            });
    }
}
