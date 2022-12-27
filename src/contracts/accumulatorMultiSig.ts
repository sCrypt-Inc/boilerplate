import { method, prop, SmartContract, assert, Ripemd160, PubKey, Sig, hash160, FixedArray, bsv, toHex } from "scrypt-ts";
import { UTXO } from "../types";

export class AccumulatorMultiSig extends SmartContract {

    @prop()
    threshold: bigint;

    @prop()
    pubKeyHashs: FixedArray<Ripemd160, 3>;

    public static readonly N: number = 3;


    constructor(threshold: bigint, pubKeyHashs: FixedArray<Ripemd160, 3>) {
        super(threshold, pubKeyHashs);
        this.threshold = threshold
        this.pubKeyHashs = pubKeyHashs;
    }

    @method
    public main(pubKeys: FixedArray<PubKey, 3>, sigs: FixedArray<Sig, 3>, masks: FixedArray<boolean, 3>) {

        let total: bigint = 0n;

        for (let i = 0; i < AccumulatorMultiSig.N; i++) {
            if (masks[i]) {
                if (hash160(pubKeys[i]) == this.pubKeyHashs[i] && this.checkSig(sigs[i], pubKeys[i])) {
                    total++;
                }
            }
        }
        assert(total >= this.threshold);

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

    getCallTx(pubKeys: bsv.PublicKey[], privateKey: bsv.PrivateKey[], prevTx: bsv.Transaction): bsv.Transaction {
        const inputIndex = 0;
        return new bsv.Transaction()
            .addInputFromPrevTx(prevTx)
            .setInputScript({
                inputIndex,
                privateKey
            }, (tx) => {
                const sigs = tx.getSignature(inputIndex)

                this.unlockFrom = {tx, inputIndex};
                
                return this.getUnlockingScript(self => {
                    self.main([PubKey(toHex(pubKeys[0])), PubKey(toHex(pubKeys[1])), PubKey(toHex(pubKeys[2]))],
                        [Sig(sigs[0]), Sig(sigs[1]), Sig(sigs[2])],
                        [true, true, true])
                });
            })
    }

}