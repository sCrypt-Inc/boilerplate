import {assert, bsv, ByteString, method, prop, Sha256, sha256, SmartContract} from "scrypt-ts";
import {UTXO} from "../types";

export class HashPuzzle extends SmartContract {

    @prop()
    sha256: Sha256;

    constructor(sha256: Sha256) {
        super(sha256);
        this.sha256 = sha256;
    }

    @method()
    public unlock(data: ByteString) {
        assert(this.sha256 == sha256(data), 'hashes are not equal');
    }

    getDeployTx(utxos: UTXO[], satoshis: number): bsv.Transaction {
        return new bsv.Transaction().from(utxos)
            .addOutput(new bsv.Transaction.Output({
                script: this.lockingScript,
                satoshis: satoshis,
            }))
    }

    getCallTx(data: ByteString, prevTx: bsv.Transaction): bsv.Transaction {
        return new bsv.Transaction()
            .addInputFromPrevTx(prevTx)
            .setInputScript(0, () => {
                return this.getUnlockingScript(self => self.unlock(data));
            })
    }
}
