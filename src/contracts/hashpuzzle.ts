import { method, prop, SmartContract, assert, Sha256, sha256, bsv } from "scrypt-ts";
import { UTXO } from "../types";

export class HashPuzzle extends SmartContract {

    @prop()
    sha256: Sha256;


    constructor(sha256: Sha256) {
        super(sha256);
        this.sha256 = sha256;
    }

    @method
    public unlock(data: string) {
        assert(this.sha256.toString() == sha256(data));
    }

    getDeployTx(utxos: UTXO[], satoshis: number): bsv.Transaction {
        return new bsv.Transaction().from(utxos)
            .addOutput(new bsv.Transaction.Output({
                script: this.lockingScript,
                satoshis: satoshis,
            }))
    }

    getCallTx(data: string, prevTx: bsv.Transaction): bsv.Transaction {
        return new bsv.Transaction()
            .addInputFromPrevTx(prevTx)
            .setInputScript(0, () => {
                return this.getUnlockingScript(self => self.unlock(data));
            })
    }

}