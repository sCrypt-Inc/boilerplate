import {
    assert,
    ContractTransaction,
    ByteString,
    hash256,
    method,
    prop,
    PubKey,
    Sig,
    Utils,
    bsv,
    slice,
    StatefulNext,
    pubKey2Addr,
    Constants,
} from 'scrypt-ts'
import { BSV20V2, OrdiMethodCallOptions } from 'scrypt-ord'

import Transaction = bsv.Transaction
import Script = bsv.Script

export class BSV20Auction extends BSV20V2 {
    // Output of auctioned ordinal (txid + vout).
    @prop()
    readonly ordinalPrevout: ByteString

    // Amount of auctioned tokens.
    @prop()
    readonly tokenAmt: bigint

    // The bidder's public key.
    @prop(true)
    bidder: PubKey

    // The auctioneer's public key.
    @prop()
    readonly auctioneer: PubKey

    // Deadline of the auction. Can be block height or timestamp.
    @prop()
    readonly auctionDeadline: bigint

    constructor(
        id: ByteString,
        sym: ByteString,
        max: bigint,
        dec: bigint,
        tokenAmt: bigint,
        ordinalPrevout: ByteString,
        auctioneer: PubKey,
        auctionDeadline: bigint
    ) {
        super(id, sym, max, dec)
        this.init(...arguments)

        this.tokenAmt = tokenAmt
        this.ordinalPrevout = ordinalPrevout
        this.bidder = auctioneer
        this.auctioneer = auctioneer
        this.auctionDeadline = auctionDeadline
    }

    // Call this public method to bid with a higher offer.
    @method()
    public bid(bidder: PubKey, bid: bigint) {
        const highestBid: bigint = this.ctx.utxo.value
        assert(
            bid > highestBid,
            'the auction bid is lower than the current highest bid'
        )

        // Change the public key of the highest bidder.
        const highestBidder: PubKey = this.bidder
        this.bidder = bidder

        // Auction continues with a higher bidder.
        const auctionOutput: ByteString = this.buildStateOutput(bid)

        // Refund previous highest bidder.
        const refundOutput: ByteString = Utils.buildPublicKeyHashOutput(
            pubKey2Addr(highestBidder),
            highestBid
        )
        let outputs: ByteString = auctionOutput + refundOutput

        // Add change output.
        outputs += this.buildChangeOutput()

        assert(
            hash256(outputs) == this.ctx.hashOutputs,
            'hashOutputs check failed'
        )
    }

    // Close the auction if deadline is reached.
    @method()
    public close(sigAuctioneer: Sig) {
        // Check auction deadline.
        assert(this.timeLock(this.auctionDeadline), 'deadline not reached')

        // Check signature of the auctioneer.
        assert(
            this.checkSig(sigAuctioneer, this.auctioneer),
            'signature check failed'
        )

        // Ensure the first input is spending the auctioned ordinal UTXO.
        assert(
            slice(this.prevouts, 0n, Constants.OutpointLen) ==
                this.ordinalPrevout,
            'first input is not spending specified ordinal UTXO'
        )

        // Ensure the ordinal is being payed out to the winning bidder.
        let outputs = BSV20V2.buildTransferOutput(
            pubKey2Addr(this.bidder),
            this.id,
            this.tokenAmt
        )

        // Ensure the second output is paying the bid to the auctioneer.
        outputs += Utils.buildPublicKeyHashOutput(
            pubKey2Addr(this.auctioneer),
            this.ctx.utxo.value
        )

        // Add change output.
        outputs += this.buildChangeOutput()

        // Check outputs.
        assert(hash256(outputs) == this.ctx.hashOutputs, 'hashOutputs mismatch')
    }

    // User defined transaction builder for calling function `bid`
    static buildTxForBid(
        current: BSV20Auction,
        options: OrdiMethodCallOptions<BSV20Auction>,
        bidder: PubKey,
        bid: bigint
    ): Promise<ContractTransaction> {
        const next = options.next as StatefulNext<BSV20Auction>

        const unsignedTx: Transaction = new Transaction()
            // add contract input
            .addInput(current.buildContractInput())
            // build next instance output
            .addOutput(
                new Transaction.Output({
                    script: next.instance.lockingScript,
                    satoshis: Number(bid),
                })
            )
            // build refund output
            .addOutput(
                new Transaction.Output({
                    script: Script.fromHex(
                        Utils.buildPublicKeyHashScript(
                            pubKey2Addr(current.bidder)
                        )
                    ),
                    satoshis: current.balance,
                })
            )

        if (options.changeAddress) {
            // build change output
            unsignedTx.change(options.changeAddress)
        }

        return Promise.resolve({
            tx: unsignedTx,
            atInputIndex: 0,
            nexts: [
                {
                    instance: next.instance,
                    atOutputIndex: 0,
                    balance: next.balance,
                },
            ],
        })
    }
}
