import { method, prop, SmartContract, assert, PubKeyHash, Sig, PubKey, hash160, bsv, toHex } from "scrypt-ts";
import { UTXO } from "../types";


export class P2PKH extends SmartContract {

    @prop()
    readonly pubKeyHash: PubKeyHash;

    constructor(pubKeyHash: PubKeyHash) {
        super(pubKeyHash);
        this.pubKeyHash = pubKeyHash;
    }


    @method
    public unlock(sig: Sig, pubkey: PubKey) {
        assert(hash160(pubkey.toString()) == this.pubKeyHash.toString());
        assert(this.checkSig(sig, pubkey));
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

    getCallTx(pubKey: bsv.PublicKey, privateKey: bsv.PrivateKey, prevTx: bsv.Transaction): bsv.Transaction {
        const inputIndex = 0;
        return new bsv.Transaction()
            .addInputFromPrevTx(prevTx)
            .setInputScript({
                inputIndex,
                privateKey
            }, (tx) => {
                const sig = tx.getSignature(inputIndex)

                this.unlockFrom = {tx, inputIndex};
                
                return this.getUnlockingScript(self => {
                    self.unlock(Sig(sig as string), PubKey(toHex(pubKey)))
                });
            })
    }
}