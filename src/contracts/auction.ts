import { method, prop, SmartContract, assert, PubKeyHash, PubKey, SigHashPreimage, Sig, SigHash, hash256, Utils, bsv, buildPublicKeyHashScript } from "scrypt-ts";
import { UTXO } from "../types";




export class Auction extends SmartContract {

    @prop(true)
    bidder: PubKeyHash;

    @prop()
    auctioner: PubKey;

    @prop()
    auctionDeadline: bigint;


    constructor(bidder: PubKeyHash, auctioner: PubKey, auctionDeadline: bigint) {
        super(bidder, auctioner, auctionDeadline);
        this.bidder = bidder;
        this.auctioner = auctioner;
        this.auctionDeadline = auctionDeadline; 
    }


    // bid with a higher offer
    @method
    public bid(bidder: PubKeyHash, bid: bigint , changeSats: bigint , txPreimage: SigHashPreimage) {
        let highestBid: bigint = SigHash.value(txPreimage);
        assert(bid > highestBid);

        let highestBidder: PubKeyHash = this.bidder;
        this.bidder = bidder;

        // auction continues with a higher bidder
        let stateScript: string = this.getStateScript();
        let auctionOutput: string = Utils.buildOutput(stateScript, bid);

        // refund previous highest bidder
        let refundScript: string = Utils.buildPublicKeyHashScript(highestBidder);
        let refundOutput: string = Utils.buildOutput(refundScript, highestBid);
        let output:string = auctionOutput + refundOutput;

        if(changeSats > 0) {

            let changeScript: string = Utils.buildPublicKeyHashScript(bidder);
            let changeOutput: string = Utils.buildOutput(changeScript, changeSats);
            output += changeOutput;
        }

        assert(this.propagateState(txPreimage, output));
    }

    @method
    public close(sig: Sig, txPreimage: SigHashPreimage) {
        assert(this.checkPreimage(txPreimage));
        assert(SigHash.nLocktime(txPreimage) >= this.auctionDeadline);
        assert(this.checkSig(sig, this.auctioner));
    }

    @method
    propagateState(txPreimage: SigHashPreimage , outputs: string) : boolean {
        assert(this.checkPreimage(txPreimage));
        return (hash256(outputs) == SigHash.hashOutputs(txPreimage));
    }


    getDeployTx(utxos: UTXO[], initBalance: number): bsv.Transaction {
        const tx = new bsv.Transaction()
            .from(utxos)
            .addOutput(new bsv.Transaction.Output({
                script: this.lockingScript,
                satoshis: initBalance,
            }));
        this.lockTo = { tx, outputIndex: 0 };
        return tx;
    }

    getCallTxForBid(utxos: UTXO[], prevTx: bsv.Transaction, nextInst: Auction, bidder: PubKeyHash, bid: number): bsv.Transaction {
        const inputIndex = 0;
        return new bsv.Transaction()
            .addInputFromPrevTx(prevTx)
            .from(utxos)
            .setOutput(0, (tx: bsv.Transaction) => {
                nextInst.lockTo = { tx, outputIndex: 0 };

                return new bsv.Transaction.Output({
                    script: nextInst.lockingScript,
                    satoshis: bid,
                })
            })
            .setOutput(1, (tx: bsv.Transaction) => {
                nextInst.lockTo = { tx, outputIndex: 0 };

                return new bsv.Transaction.Output({
                    script: buildPublicKeyHashScript(this.bidder),
                    satoshis: tx.getInputAmount(inputIndex),
                })
            })
            .setOutput(2, (tx: bsv.Transaction) => {
                nextInst.lockTo = { tx, outputIndex: 0 };
                return new bsv.Transaction.Output({
                    script: buildPublicKeyHashScript(bidder),
                    satoshis: tx.inputAmount - tx.outputAmount - tx.getEstimateFee()
                })
            })
            .setInputScript({
                inputIndex
            }, (tx: bsv.Transaction) => {
                this.unlockFrom = { tx, inputIndex };
                return this.getUnlockingScript(self => {
                    self.bid(bidder, BigInt(bid), BigInt(tx.getOutputAmount(2)), SigHashPreimage(tx.getPreimage(inputIndex)));
                })
            });
    }
}
