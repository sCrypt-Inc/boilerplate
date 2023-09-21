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
    slice,
    StatefulNext,
    pubKey2Addr,
} from 'scrypt-ts'

import Transaction = bsv.Transaction
import Address = bsv.Address
import Script = bsv.Script

export class BSV20Auction extends SmartContract {
    // Output of auctioned ordinal (txid + vout).
    @prop()
    readonly ordinalPrevout: ByteString

    // Inscription for the BSV-20 transfer.
    // Example:
    // OP_FALSE OP_IF 6f7264 OP_TRUE application/bsv-20 OP_FALSE
    // {
    //   "p": "bsv-20",
    //   "op": "transfer",
    //   "tick": "ordi",
    //   "amt": "1000"
    // }
    // OP_ENDIF
    @prop()
    readonly transferInscription: ByteString

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
        transferInscription: ByteString,
        auctioneer: PubKey,
        auctionDeadline: bigint
    ) {
        super(...arguments)
        this.ordinalPrevout = ordinalPrevout
        this.transferInscription = transferInscription
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
            slice(this.prevouts, 0n, 36n) == this.ordinalPrevout,
            'first input is not spending specified ordinal UTXO'
        )

        // Ensure the ordinal is being payed out to the winning bidder.
        const outScript =
            this.transferInscription +
            Utils.buildPublicKeyHashScript(pubKey2Addr(this.bidder))
        let outputs = Utils.buildOutput(outScript, 1n)

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
        options: MethodCallOptions<BSV20Auction>,
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
