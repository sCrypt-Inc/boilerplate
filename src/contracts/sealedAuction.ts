import {
    ByteString,
    HashedMap,
    HashedSet,
    PubKey,
    Sha256,
    SmartContract,
    Utils,
    assert,
    hash256,
    int2ByteString,
    method,
    prop,
    pubKey2Addr,
    toByteString,
} from 'scrypt-ts'

export class SealedAuction extends SmartContract {
    @prop()
    auctioneer: PubKey

    @prop(true)
    bidCommitments: HashedMap<PubKey, Sha256>

    @prop(true)
    hasWithdrawnCollateral: HashedSet<PubKey>

    @prop()
    biddingDeadline: bigint

    @prop()
    revealDeadline: bigint

    @prop(true)
    biddingFinished: boolean

    @prop()
    collateralAmount: bigint

    @prop(true)
    highestBidder: PubKey

    @prop(true)
    highestBidderAmount: bigint

    @prop(true)
    auctionFinished: boolean

    constructor(
        auctioneer: PubKey,
        biddingDeadline: bigint,
        revealDeadline: bigint,
        bidCommitments: HashedMap<PubKey, Sha256>,
        hasWithdrawnCollateral: HashedSet<PubKey>,
        collateralAmount: bigint
    ) {
        super(...arguments)
        this.auctioneer = auctioneer
        this.biddingDeadline = biddingDeadline
        this.revealDeadline = revealDeadline
        this.biddingFinished = true
        this.bidCommitments = bidCommitments
        this.hasWithdrawnCollateral = hasWithdrawnCollateral
        this.collateralAmount = collateralAmount
        this.highestBidder = PubKey(
            toByteString(
                '000000000000000000000000000000000000000000000000000000000000000000000000'
            )
        )
        this.highestBidderAmount = 0n
        this.auctionFinished = false
    }

    @method()
    public bid(bidder: PubKey, bidCommitment: Sha256) {
        // Check bidding is not finished
        assert(!this.biddingFinished, 'bidding phase already finished')

        // Check if pubKey not already present.
        assert(
            !this.bidCommitments.has(bidder),
            'bid for pubkey already submitted'
        )

        // Add commitment.
        this.bidCommitments.set(bidder, bidCommitment)

        // Propagate contract with added collateral amount.
        let outputs = this.buildStateOutput(
            this.ctx.utxo.value + this.collateralAmount
        )
        outputs += this.buildChangeOutput()
        assert(hash256(outputs) == this.ctx.hashOutputs, 'hashOutputs mismatch')
    }

    @method()
    public revealBid(
        bidder: PubKey,
        bidCommitment: Sha256,
        bid: bigint,
        salt: ByteString
    ) {
        // Check if bidding deadline is reached.
        assert(
            this.timeLock(this.biddingDeadline),
            'locktime has not yet expired'
        )

        // First reveal officially finishes the bidding phase.
        this.biddingFinished = true

        // Check if pubkey present and that it contains passed commitment value.
        assert(
            this.bidCommitments.canGet(bidder, bidCommitment),
            'passed commitment not present'
        )

        // Check commitment.
        assert(
            hash256(int2ByteString(bid, 32n) + salt) == bidCommitment,
            'data does not match commitment'
        )

        // Ensure bid isn't larger than the collateral.
        assert(bid <= this.collateralAmount, 'bid too high')

        // Check if bid is higher than current highest and update if so.
        if (bid > this.highestBidderAmount) {
            // Update highest bid.
            this.highestBidder = bidder
            this.highestBidderAmount = bid
        }

        // Propagate contract outputs.
        let outputs = this.buildStateOutput(this.ctx.utxo.value)
        outputs += this.buildChangeOutput()
        assert(hash256(outputs) == this.ctx.hashOutputs, 'hashOutputs mismatch')
    }

    @method()
    public finish() {
        // Check that auction has not yet been finished.
        assert(!this.auctionFinished, 'auction was already finished')

        // Check if reveal deadline is reached.
        assert(
            this.timeLock(this.revealDeadline),
            'locktime has not yet expired'
        )

        // Set auctionFinished to true.
        this.auctionFinished = true

        let outputs = this.buildStateOutput(
            this.ctx.utxo.value + this.highestBidderAmount
        )
        // If at least one revealed bid, pay the bid to the auctioneer.
        if (this.highestBidderAmount > 0n) {
            outputs += Utils.buildPublicKeyHashOutput(
                pubKey2Addr(this.auctioneer),
                this.highestBidderAmount
            )
        }
        outputs += this.buildChangeOutput()
        assert(hash256(outputs) == this.ctx.hashOutputs, 'hashOutputs mismatch')
    }

    @method()
    public withdrawCollateral(bidder: PubKey) {
        // Check if auction finished.
        assert(this.auctionFinished, 'auction not finished yet')

        // Check if already withdrawn.
        assert(
            !this.hasWithdrawnCollateral.has(bidder),
            'bidder has already withdrawn collateral'
        )

        // Add bidder to already withdrawn set.
        this.hasWithdrawnCollateral.add(bidder)

        // Pay back collateral amount to bidder.
        // If winning bidder, pay the difference only.
        let amount = this.collateralAmount
        if (bidder == this.highestBidder) {
            amount -= this.highestBidderAmount
        }

        let outputs = this.buildStateOutput(this.ctx.utxo.value - amount)
        outputs += Utils.buildPublicKeyHashOutput(pubKey2Addr(bidder), amount)
        outputs += this.buildChangeOutput()
        assert(hash256(outputs) == this.ctx.hashOutputs, 'hashOutputs mismatch')
    }
}
