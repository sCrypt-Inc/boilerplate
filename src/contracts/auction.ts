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
    UTXO,
} from 'scrypt-ts'

export class Auction extends SmartContract {
    public static readonly LOCKTIME_BLOCK_HEIGHT_MARKER = 500000000

    // The bidders address.
    @prop(true)
    bidder: PubKeyHash

    // The auctioneers public key.
    @prop()
    auctioneer: PubKey

    // Deadline of the auction. Can be block height or timestamp.
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

    // Call this public method to bid with a higher offer.
    @method()
    public bid(bidder: PubKeyHash, bid: bigint, changeSatoshis: bigint) {
        const highestBid: bigint = this.ctx.utxo.value
        assert(
            bid > highestBid,
            'the auction bid is lower than the current highest bid'
        )

        // Change the address of the highest bidder.
        const highestBidder: PubKeyHash = this.bidder
        this.bidder = bidder

        // Auction continues with a higher bidder.
        const auctionOutput: ByteString = this.buildStateOutput(bid)

        // Refund previous highest bidder.
        const refundScript: ByteString =
            Utils.buildPublicKeyHashScript(highestBidder)
        const refundOutput: ByteString = Utils.buildOutput(
            refundScript,
            highestBid
        )
        let outputs: ByteString = auctionOutput + refundOutput

        // Add change output.
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

    // Close the auction if deadline is reached.
    @method()
    public close(sig: Sig) {
        // Check if using block height.
        if (this.auctionDeadline < Auction.LOCKTIME_BLOCK_HEIGHT_MARKER) {
            // Enforce nLocktime field to also use block height.
            assert(this.ctx.locktime < Auction.LOCKTIME_BLOCK_HEIGHT_MARKER)
        }
        assert(
            this.ctx.sequence < 0xffffffffn,
            'input sequence should less than UINT_MAX'
        )
        assert(
            this.ctx.locktime >= this.auctionDeadline,
            'auction is not over yet'
        )

        // Check signature of the auctioneer.
        assert(this.checkSig(sig, this.auctioneer), 'signature check failed')
    }

    // Local method to construct deployment TX.
    getDeployTx(utxos: UTXO[], initBalance: number): bsv.Transaction {
        const tx = new bsv.Transaction().from(utxos).addOutput(
            new bsv.Transaction.Output({
                script: this.lockingScript,
                satoshis: initBalance,
            })
        )
        this.from = { tx, outputIndex: 0 }
        return tx
    }

    // Local method to construct TX for a bid.
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
                nextInst.from = { tx, outputIndex: 0 }
                return new bsv.Transaction.Output({
                    script: nextInst.lockingScript,
                    satoshis: bid,
                })
            })
            .setOutput(1, (tx: bsv.Transaction) => {
                nextInst.from = { tx, outputIndex: 0 }
                return new bsv.Transaction.Output({
                    script: buildPublicKeyHashScript(this.bidder),
                    satoshis: tx.getInputAmount(inputIndex),
                })
            })
            .setOutput(2, (tx: bsv.Transaction) => {
                nextInst.from = { tx, outputIndex: 0 }
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
                    this.to = { tx, inputIndex }
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

    // Local method to construct TX for closing the auction.
    getCallTxForClose(
        timeNow: number,
        privateKey: bsv.PrivateKey,
        prevTx: bsv.Transaction
    ) {
        const inputIndex = 0
        const callTx: bsv.Transaction =
            new bsv.Transaction().addInputFromPrevTx(prevTx)

        callTx.setLockTime(timeNow)
        callTx.setInputSequence(inputIndex, 0)

        return callTx
            .setInputScript(
                {
                    inputIndex,
                    privateKey,
                },
                (tx) => {
                    const sig = tx.getSignature(inputIndex)
                    this.to = { tx, inputIndex }
                    return this.getUnlockingScript((self) => {
                        self.close(Sig(sig as string))
                    })
                }
            )
            .addOutput(
                new bsv.Transaction.Output({
                    script: bsv.Script.buildPublicKeyHashOut(
                        privateKey.toPublicKey()
                    ),
                    satoshis: Number(this.ctx.utxo.value),
                })
            )
    }
}
