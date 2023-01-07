import {assert, bsv, method, prop, SigHash, SigHashPreimage, SmartContract} from "scrypt-ts";
import {UTXO} from "../types";


export class AdvancedCounter extends SmartContract {

    @prop(true)
    counter: bigint;
    private balance: number;

    constructor(counter: bigint) {
        super(counter);
        this.counter = counter;
    }

    @method()
    public increment(txPreimage: SigHashPreimage) {
        this.counter++;

        // ensure output matches what we expect:
        // - amount is same as specified
        // - output script is the same as scriptCode except the counter was incremented
        let amount: bigint = SigHash.value(txPreimage);
        assert(this.updateStateSigHashType(txPreimage, amount, SigHash.ANYONECANPAY_SINGLE), 'stateSigHashType update failed');
    }

    getDeployTx(utxos: UTXO[], initBalance: number): bsv.Transaction {
        this.balance = initBalance;
        const tx = new bsv.Transaction().from(utxos)
            .addOutput(new bsv.Transaction.Output({
                script: this.lockingScript,
                satoshis: initBalance,
            }));
        this.lockTo = {tx, outputIndex: 0};
        return tx;
    }

    getCallTx(utxos: UTXO[], prevTx: bsv.Transaction, nextInst: AdvancedCounter): bsv.Transaction {
        const inputIndex = 0;
        return new bsv.Transaction()
            .addInputFromPrevTx(prevTx)
            .from(utxos)
            .setOutput(0, (tx: bsv.Transaction) => {
                nextInst.lockTo = {tx, outputIndex: 0};

                return new bsv.Transaction.Output({
                    script: nextInst.lockingScript,
                    satoshis: tx.getInputAmount(inputIndex),
                })
            })
            .setInputScript({
                inputIndex,
                sigtype: bsv.crypto.Signature.SIGHASH_ANYONECANPAY | bsv.crypto.Signature.SIGHASH_SINGLE | bsv.crypto.Signature.SIGHASH_FORKID
            }, (tx: bsv.Transaction) => {
                this.unlockFrom = {tx, inputIndex};
                return this.getUnlockingScript(self => {
                    self.increment(SigHashPreimage(tx.getPreimage(inputIndex)));
                })
            });
    }
}
