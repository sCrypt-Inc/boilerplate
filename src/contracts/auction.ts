import {
    assert,
    bsv,
    BuildMethodCallTxOptions,
    BuildMethodCallTxResult,
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

export class Auction extends SmartContract {
    static readonly LOCKTIME_BLOCK_HEIGHT_MARKER = 500000000
    static readonly UINT_MAX = 0xffffffffn

    // The bidder's address.
    @prop(true)
    bidder: PubKeyHash

    // The auctioneer's public key.
    @prop()
    readonly auctioneer: PubKey

    // Deadline of the auction. Can be block height or timestamp.
    @prop()
    readonly auctionDeadline: bigint

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
    public bid(bidder: PubKeyHash, bid: bigint) {
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
        const refundOutput: ByteString = Utils.buildPublicKeyHashOutput(
            highestBidder,
            highestBid
        )
        let outputs: ByteString = auctionOutput + refundOutput

        // Add change output.
        if (this.changeAmount > 0) {
            outputs += this.buildChangeOutput()
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
            this.ctx.sequence < Auction.UINT_MAX,
            'input sequence should less than UINT_MAX'
        )
        assert(
            this.ctx.locktime >= this.auctionDeadline,
            'auction is not over yet'
        )

        // Check signature of the auctioneer.
        assert(this.checkSig(sig, this.auctioneer), 'signature check failed')
    }

    // User defined transaction builder for calling function `bid`
    static bidTxBuilder(
        options: BuildMethodCallTxOptions<Auction>,
        bidder: PubKeyHash,
        bid: bigint
    ): Promise<BuildMethodCallTxResult<Auction>> {
        const current = options.current

        const nextInstance = current.next()
        nextInstance.bidder = bidder

        const unsignedTx: bsv.Transaction = new bsv.Transaction()
            // add contract input
            .addInput(current.buildContractInput(options.fromUTXO))
            // add p2pkh inputs
            .from(options.utxos)
            // build next instance output
            .addOutput(
                new bsv.Transaction.Output({
                    script: nextInstance.lockingScript,
                    satoshis: Number(bid),
                })
            )
            // build refund output
            .addOutput(
                new bsv.Transaction.Output({
                    script: bsv.Script.fromHex(
                        Utils.buildPublicKeyHashScript(current.bidder)
                    ),
                    satoshis:
                        options.fromUTXO?.satoshis ??
                        current.from.tx.outputs[current.from.outputIndex]
                            .satoshis,
                })
            )
            // build change output
            .change(options.changeAddress)

        return Promise.resolve({
            unsignedTx,
            atInputIndex: 0,
            nexts: [
                {
                    instance: nextInstance,
                    atOutputIndex: 0,
                    balance: Number(bid),
                },
            ],
        })
    }
}