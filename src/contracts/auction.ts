import {
    assert,
    bsv,
    buildPublicKeyHashScript,
    ByteString,
    hash256,
    method,
    prop,
    PubKey,
    PubKeyHash,
    Sig,
    SmartContract,
    Utils,
} from 'scrypt-ts'
import { UTXO } from '../types'

export class Auction extends SmartContract {
    @prop(true)
    bidder: PubKeyHash

    @prop()
    auctioneer: PubKey

    @prop()
    auctionDeadline: bigint

    constructor(
        bidder: PubKeyHash,
        auctioneer: PubKey,
        auctionDeadline: bigint
    ) {
        super(...arguments)
        this.bidder = bidder
        this.auctioneer = auctioneer
        this.auctionDeadline = auctionDeadline
    }

    // bid with a higher offer
    @method()
    public bid(bidder: PubKeyHash, bid: bigint, changeSatoshis: bigint) {
        const highestBid: bigint = this.ctx.utxo.value
        assert(
            bid > highestBid,
            'the auction bid is lower than the current highest bid'
        )

        const highestBidder: PubKeyHash = this.bidder
        this.bidder = bidder

        // auction continues with a higher bidder
        const auctionOutput: ByteString = this.buildStateOutput(bid)

        // refund previous highest bidder
        const refundScript: ByteString =
            Utils.buildPublicKeyHashScript(highestBidder)
        const refundOutput: ByteString = Utils.buildOutput(
            refundScript,
            highestBid
        )
        let outputs: ByteString = auctionOutput + refundOutput

        if (changeSatoshis > 0) {
            const changeScript: ByteString =
                Utils.buildPublicKeyHashScript(bidder)
            const changeOutput: ByteString = Utils.buildOutput(
                changeScript,
                changeSatoshis
            )
            outputs += changeOutput
        }

        assert(
            hash256(outputs) == this.ctx.hashOutputs,
            'hashOutputs check failed'
        )
    }

    @method()
    public close(sig: Sig) {
        assert(
            this.ctx.nLocktime >= this.auctionDeadline,
            'auction is not over yet'
        )
        assert(this.checkSig(sig, this.auctioneer), 'signature check failed')
    }

    getDeployTx(utxos: UTXO[], initBalance: number): bsv.Transaction {
        const tx = new bsv.Transaction().from(utxos).addOutput(
            new bsv.Transaction.Output({
                script: this.lockingScript,
                satoshis: initBalance,
            })
        )
        this.lockTo = { tx, outputIndex: 0 }
        return tx
    }

    getCallTxForBid(
        utxos: UTXO[],
        prevTx: bsv.Transaction,
        nextInst: Auction,
        bidder: PubKeyHash,
        bid: number
    ): bsv.Transaction {
        const inputIndex = 0
        return new bsv.Transaction()
            .addInputFromPrevTx(prevTx)
            .from(utxos)
            .setOutput(0, (tx: bsv.Transaction) => {
                nextInst.lockTo = { tx, outputIndex: 0 }
                return new bsv.Transaction.Output({
                    script: nextInst.lockingScript,
                    satoshis: bid,
                })
            })
            .setOutput(1, (tx: bsv.Transaction) => {
                nextInst.lockTo = { tx, outputIndex: 0 }
                return new bsv.Transaction.Output({
                    script: buildPublicKeyHashScript(this.bidder),
                    satoshis: tx.getInputAmount(inputIndex),
                })
            })
            .setOutput(2, (tx: bsv.Transaction) => {
                nextInst.lockTo = { tx, outputIndex: 0 }
                return new bsv.Transaction.Output({
                    script: buildPublicKeyHashScript(bidder),
                    satoshis:
                        tx.inputAmount - tx.outputAmount - tx.getEstimateFee(),
                })
            })
            .setInputScript(
                {
                    inputIndex,
                },
                (tx: bsv.Transaction) => {
                    this.unlockFrom = { tx, inputIndex }
                    return this.getUnlockingScript((self) => {
                        self.bid(
                            bidder,
                            BigInt(bid),
                            BigInt(tx.getOutputAmount(2))
                        )
                    })
                }
            )
    }
}
