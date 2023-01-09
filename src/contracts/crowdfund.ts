import {assert, bsv, buildPublicKeyHashScript, hash256, method, prop, PubKey, PubKeyHash, Sig, SmartContract, Utils} from "scrypt-ts";
import {UTXO} from "../types";

export class Crowdfund extends SmartContract {
    @prop()
    recipient: PubKeyHash;

    @prop()
    contributor: PubKey;

    @prop()
    deadline: bigint;

    @prop()
    target: bigint;

    constructor(recipient: PubKeyHash, contributor: PubKey, deadline: bigint, target: bigint) {
        super(recipient, contributor, deadline, target);
        this.recipient = recipient;
        this.contributor = contributor;
        this.deadline = deadline;
        this.target = target;
    }

    // collect pledged fund
    @method()
    public collect(raisedAmount: bigint) {

        // reach target
        assert(raisedAmount >= this.target, 'raisedAmount is less than this.target');

        // fund goes to the recipient
        let lockingScript = Utils.buildPublicKeyHashScript(this.recipient);

        let output = Utils.buildOutput(lockingScript, raisedAmount);
        assert(hash256(output) == this.ctx.hashOutputs, 'hashOutputs check failed');
    }

    // contributor can take the fund back after deadline
    @method()
    public refund(sig: Sig) {
        // require nLocktime enabled https://wiki.bitcoinsv.io/index.php/NLocktime_and_nSequence
        assert(this.ctx.nSequence < 0xffffffffn, 'require nLocktime enabled');

        // fundraising expired
        assert(this.ctx.nLocktime >= this.deadline, 'fundraising expired');
        assert(this.checkSig(sig, this.contributor), 'signature check failed');
    }

    getDeployTx(utxos: UTXO[], initBalance: number): bsv.Transaction {
        const tx = new bsv.Transaction().from(utxos)
            .addOutput(new bsv.Transaction.Output({
                script: this.lockingScript,
                satoshis: initBalance,
            }));
        this.lockTo = {tx, outputIndex: 0};
        return tx;
    }

    getCallCollectTx(prevTx: bsv.Transaction, recipient: PubKeyHash, raisedAmount: bigint): bsv.Transaction {
        const inputIndex = 0;
        return new bsv.Transaction()
            .addInputFromPrevTx(prevTx)
            .setOutput(0, () => {
                return new bsv.Transaction.Output({
                    script: buildPublicKeyHashScript(recipient),
                    satoshis: Number(raisedAmount),
                })
            })
            .setInputScript(inputIndex, (tx: bsv.Transaction) => {
                this.unlockFrom = {tx, inputIndex};
                return this.getUnlockingScript(self => {
                    self.collect(raisedAmount);
                })
            })
            .seal();
    }

    getCallRefundTx(prevTx: bsv.Transaction, anyone: PubKeyHash, privateKey: bsv.PrivateKey, locktime: number): bsv.Transaction {
        const inputIndex = 0;
        const tx = new bsv.Transaction()
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
                this.unlockFrom = {tx, inputIndex};
                return this.getUnlockingScript(self => {
                    self.refund(Sig(tx.getSignature(0) as string));
                })
            })
            .seal();

        return tx;
    }

}