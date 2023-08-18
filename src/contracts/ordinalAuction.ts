import {
    assert,
    MethodCallOptions,
    ContractTransaction,
    ByteString,
    hash256,
    method,
    prop,
    PubKey,
    Sig,
    SmartContract,
    Utils,
    bsv,
    hash160,
    slice,
    StatefulNext,
} from 'scrypt-ts'

import Transaction = bsv.Transaction
import Address = bsv.Address
import Script = bsv.Script

export class OrdinalAuction extends SmartContract {
    static readonly LOCKTIME_BLOCK_HEIGHT_MARKER = 500000000
    static readonly UINT_MAX = 0xffffffffn

    @prop()
    ordnialPrevout: ByteString

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
        ordinalPrevout: ByteString,
        auctioneer: PubKey,
        auctionDeadline: bigint
    ) {
        super(...arguments)
        this.ordnialPrevout = ordinalPrevout
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
            hash160(highestBidder),
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
        // Check if using block height.
        if (
            this.auctionDeadline < OrdinalAuction.LOCKTIME_BLOCK_HEIGHT_MARKER
        ) {
            // Enforce nLocktime field to also use block height.
            assert(
                this.ctx.locktime < OrdinalAuction.LOCKTIME_BLOCK_HEIGHT_MARKER
            )
        }
        assert(
            this.ctx.sequence < OrdinalAuction.UINT_MAX,
            'input sequence should less than UINT_MAX'
        )
        assert(
            this.ctx.locktime >= this.auctionDeadline,
            'auction is not over yet'
        )

        // Check signature of the auctioneer.
        assert(
            this.checkSig(sigAuctioneer, this.auctioneer),
            'signature check failed'
        )

        // Check the passed prevouts byte string is correct.
        assert(
            hash256(this.prevouts) == this.ctx.hashPrevouts,
            'hashPrevouts mismatch'
        )

        // Ensure the first input in spending the auctioned ordinal UTXO.
        assert(
            slice(this.prevouts, 0n, 36n) == this.ordnialPrevout,
            'first input is not spending specified ordinal UTXO'
        )

        // Ensure the ordinal is being payed out to the winning bidder.
        let outputs = Utils.buildPublicKeyHashOutput(hash160(this.bidder), 1n)

        // Ensure the second output is paying the bid to the auctioneer.
        outputs += Utils.buildPublicKeyHashOutput(
            hash160(this.auctioneer),
            this.ctx.utxo.value
        )

        // Add change output.
        outputs += this.buildChangeOutput()

        // Check outputs.
        assert(hash256(outputs) == this.ctx.hashOutputs, 'hashOutputs mismatch')
    }

    // User defined transaction builder for calling function `bid`
    static buildTxForBid(
        current: OrdinalAuction,
        options: MethodCallOptions<OrdinalAuction>,
        bidder: PubKey,
        bid: bigint
    ): Promise<ContractTransaction> {
        const next = options.next as StatefulNext<OrdinalAuction>

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
                        Utils.buildPublicKeyHashScript(hash160(current.bidder))
                    ),
                    satoshis: current.balance,
                })
            )
            // build change output
            .change(options.changeAddress)

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
