import {assert, bsv, buildPublicKeyHashScript, ByteString, hash256, method, prop, PubKeyHash, SigHash, SigHashPreimage, SmartContract, Utils} from "scrypt-ts";
import {UTXO} from "../types";


export class AnyoneCanSpend extends SmartContract {

    @prop()
    pubKeyHash: PubKeyHash;

    constructor(pubKeyHash: PubKeyHash) {
        super(pubKeyHash);
        this.pubKeyHash = pubKeyHash;
    }

    @method()
    public unlock(txPreimage: SigHashPreimage, outputAmount: bigint) {

        assert(this.checkPreimageSigHashType(txPreimage, SigHash.ANYONECANPAY_SINGLE), 'preimage check failed');

        let lockingScript: ByteString = Utils.buildPublicKeyHashScript(this.pubKeyHash);
        let output: ByteString = Utils.buildOutput(lockingScript, outputAmount);
        assert(hash256(output) == SigHash.hashOutputs(txPreimage), 'hashOutput check failed');
    }

    getDeployTx(utxos: UTXO[], initBalance: number): bsv.Transaction {
        const tx = new bsv.Transaction()
            .from(utxos)
            .addOutput(new bsv.Transaction.Output({
                script: this.lockingScript,
                satoshis: initBalance,
            }));
        this.lockTo = {tx, outputIndex: 0};
        return tx;
    }

    getCallTx(prevTx: bsv.Transaction, changeAddress: PubKeyHash): bsv.Transaction {
        const inputIndex = 0;
        return new bsv.Transaction()
            .addInputFromPrevTx(prevTx)
            .setOutput(0, (tx) => {
                return new bsv.Transaction.Output({
                    script: buildPublicKeyHashScript(changeAddress),
                    satoshis: tx.inputAmount - tx.getChangeAmount()
                })
            })
            .setInputScript({
                inputIndex,
                sigtype: bsv.crypto.Signature.SIGHASH_ANYONECANPAY | bsv.crypto.Signature.SIGHASH_SINGLE | bsv.crypto.Signature.SIGHASH_FORKID
            }, (tx) => {
                this.unlockFrom = {tx, inputIndex};
                return this.getUnlockingScript(self => {
                    self.unlock(SigHashPreimage(tx.getPreimage(inputIndex)), BigInt(tx.getOutputAmount(0)))
                });
            })
    }
}
