import {assert, bsv, buildPublicKeyHashScript, ByteString, hash256, method, prop, PubKey, PubKeyHash, Sig, SigHash, SigHashPreimage, SmartContract, Utils} from "scrypt-ts";
import {UTXO} from "../types";


export class Auction extends SmartContract {

    @prop(true)
    bidder: PubKeyHash;

    @prop()
    auctioneer: PubKey;

    @prop()
    auctionDeadline: bigint;

    constructor(bidder: PubKeyHash, auctioneer: PubKey, auctionDeadline: bigint) {
        super(bidder, auctioneer, auctionDeadline);
        this.bidder = bidder;
        this.auctioneer = auctioneer;
        this.auctionDeadline = auctionDeadline;
    }

    // bid with a higher offer
    @method()
    public bid(bidder: PubKeyHash, bid: bigint, changeSatoshis: bigint, txPreimage: SigHashPreimage) {
        let highestBid: bigint = SigHash.value(txPreimage);
        assert(bid > highestBid, 'the auction bid is lower than the current highest bid');

        let highestBidder: PubKeyHash = this.bidder;
        this.bidder = bidder;

        // auction continues with a higher bidder
        let stateScript: ByteString = this.getStateScript();
        let auctionOutput: ByteString = Utils.buildOutput(stateScript, bid);

        // refund previous highest bidder
        let refundScript: ByteString = Utils.buildPublicKeyHashScript(highestBidder);
        let refundOutput: ByteString = Utils.buildOutput(refundScript, highestBid);
        let output: ByteString = auctionOutput + refundOutput;

        if (changeSatoshis > 0) {
            let changeScript: ByteString = Utils.buildPublicKeyHashScript(bidder);
            let changeOutput: ByteString = Utils.buildOutput(changeScript, changeSatoshis);
            output += changeOutput;
        }

        assert(this.propagateState(txPreimage, output), 'preimage and hashOutput check failed');
    }

    @method()
    public close(sig: Sig, txPreimage: SigHashPreimage) {
        assert(this.checkPreimage(txPreimage), 'preimage check failed');
        assert(SigHash.nLocktime(txPreimage) >= this.auctionDeadline, 'auction is not over yet');
        assert(this.checkSig(sig, this.auctioneer), 'signature check failed');
    }

    @method()
    propagateState(txPreimage: SigHashPreimage, outputs: ByteString): boolean {
        assert(this.checkPreimage(txPreimage), 'preimage check failed');
        return (hash256(outputs) == SigHash.hashOutputs(txPreimage));
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

    getCallTxForBid(utxos: UTXO[], prevTx: bsv.Transaction, nextInst: Auction, bidder: PubKeyHash, bid: number): bsv.Transaction {
        const inputIndex = 0;
        return new bsv.Transaction()
            .addInputFromPrevTx(prevTx)
            .from(utxos)
            .setOutput(0, (tx: bsv.Transaction) => {
                nextInst.lockTo = {tx, outputIndex: 0};
                return new bsv.Transaction.Output({
                    script: nextInst.lockingScript,
                    satoshis: bid,
                })
            })
            .setOutput(1, (tx: bsv.Transaction) => {
                nextInst.lockTo = {tx, outputIndex: 0};
                return new bsv.Transaction.Output({
                    script: buildPublicKeyHashScript(this.bidder),
                    satoshis: tx.getInputAmount(inputIndex),
                })
            })
            .setOutput(2, (tx: bsv.Transaction) => {
                nextInst.lockTo = {tx, outputIndex: 0};
                return new bsv.Transaction.Output({
                    script: buildPublicKeyHashScript(bidder),
                    satoshis: tx.inputAmount - tx.outputAmount - tx.getEstimateFee()
                })
            })
            .setInputScript({
                inputIndex
            }, (tx: bsv.Transaction) => {
                this.unlockFrom = {tx, inputIndex};
                return this.getUnlockingScript(self => {
                    self.bid(bidder, BigInt(bid), BigInt(tx.getOutputAmount(2)), SigHashPreimage(tx.getPreimage(inputIndex)));
                })
            });
    }
}
