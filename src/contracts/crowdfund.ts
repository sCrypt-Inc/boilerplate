
import { method, prop, SmartContract, assert, PubKeyHash, SigHash, bsv, hash256, PubKey, SigHashPreimage, Utils, Sig, buildPublicKeyHashScript } from "scrypt-ts";
import { UTXO } from "../types";

export class Crowdfund extends SmartContract {
    @prop()
    recepient: PubKeyHash;

    @prop()
    contributor: PubKey;

    @prop()
    deadline: bigint;

    @prop()
    target: bigint;

    constructor(recepient: PubKeyHash, contributor: PubKey, deadline: bigint, target: bigint) {
        super(recepient, contributor, deadline, target);
        this.recepient = recepient;
        this.contributor = contributor;
        this.deadline = deadline;
        this.target = target;
    }


    // collect pledged fund
    @method()
    public collect(raisedAmount: bigint) {

        // reach target
        assert(raisedAmount >= this.target);

        // fund goes to the recepient
        let lockingScript = Utils.buildPublicKeyHashScript(this.recepient);

        let output = Utils.buildOutput(lockingScript, raisedAmount);
        assert(hash256(output) == this.ctx.hashOutputs);

    }

    // contributor can take the fund back after deadline
    @method()
    public refund(sig: Sig) {
        // require nLocktime enabled https://wiki.bitcoinsv.io/index.php/NLocktime_and_nSequence
        assert(this.ctx.nSequence < 0xffffffffn);

        // fundraising expired
        assert(this.ctx.nLocktime >= this.deadline);
        assert(this.checkSig(sig, this.contributor));
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

    getCallCollectTx( prevTx: bsv.Transaction, recepient: PubKeyHash, raisedAmount: bigint): bsv.Transaction {
        const inputIndex = 0;
        return new bsv.Transaction()
            .addInputFromPrevTx(prevTx)
            .setOutput(0, (tx: bsv.Transaction) => {
                return new bsv.Transaction.Output({
                    script: buildPublicKeyHashScript(recepient),
                    satoshis: Number(raisedAmount),
                })
            })
            .setInputScript(inputIndex, (tx: bsv.Transaction) => {
                this.unlockFrom = { tx, inputIndex };
                return this.getUnlockingScript(self => {
                    self.collect(raisedAmount);
                })
            })
            .seal();
    }

    getCallRefundTx( prevTx: bsv.Transaction, anyone: PubKeyHash, privateKey: bsv.PrivateKey, locktime: number): bsv.Transaction {
        const inputIndex = 0;
        const tx =  new bsv.Transaction()
            .addInputFromPrevTx(prevTx)
        
            tx.setLockTime(locktime);

            tx.setOutput(0, (tx: bsv.Transaction) => {
                return new bsv.Transaction.Output({
                    script: buildPublicKeyHashScript(anyone),
                    satoshis: tx.inputAmount - tx.getEstimateFee(),
                })
            })
            .setInputSequence(inputIndex, 1)
            .setInputScript({
                inputIndex,
                privateKey
            }, (tx: bsv.Transaction) => {
                this.unlockFrom = { tx, inputIndex };
                return this.getUnlockingScript(self => {
                    self.refund(Sig(tx.getSignature(0) as string));
                })
            })
            .seal();

        return tx;
    }

}