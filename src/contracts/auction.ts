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
    UTXO,
    bsv,
    pubKey2Addr,
} from 'scrypt-ts'

import Transaction = bsv.Transaction
import Address = bsv.Address
import Script = bsv.Script

/*
 * Read Medium article about this contract:
 * https://medium.com/@xiaohuiliu/auction-on-bitcoin-4ba2b6c18ba7
 */
export class Auction extends SmartContract {
    // The bidder's public key.
    @prop(true)
    bidder: PubKey

    // The auctioneer's public key.
    @prop()
    readonly auctioneer: PubKey

    // Deadline of the auction. Can be block height or timestamp.
    @prop()
    readonly auctionDeadline: bigint

    constructor(auctioneer: PubKey, auctionDeadline: bigint) {
        super(...arguments)
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
    public close(sig: Sig) {
        // Check auction deadline.
        assert(this.timeLock(this.auctionDeadline), 'deadline not reached')

        // Check signature of the auctioneer.
        assert(this.checkSig(sig, this.auctioneer), 'signature check failed')
    }

    // Customize the deployment tx by overriding `SmartContract.buildDeployTransaction` method
    override async buildDeployTransaction(
        utxos: UTXO[],
        amount: number,
        changeAddress?: Address | string
    ): Promise<Transaction> {
        const deployTx = new Transaction()
            // add p2pkh inputs
            .from(utxos)
            // add contract output
            .addOutput(
                new Transaction.Output({
                    script: this.lockingScript,
                    satoshis: amount,
                })
            )
            // add OP_RETURN output
            .addData('Hello World')

        if (changeAddress) {
            deployTx.change(changeAddress)
            if (this._provider) {
                deployTx.feePerKb(await this.provider.getFeePerKb())
            }
        }

        return deployTx
    }

    // User defined transaction builder for calling function `bid`
    static buildTxForBid(
        current: Auction,
        options: MethodCallOptions<Auction>,
        bidder: PubKey,
        bid: bigint
    ): Promise<ContractTransaction> {
        const nextInstance = current.next()
        nextInstance.bidder = bidder

        const unsignedTx: Transaction = new Transaction()
            // add contract input
            .addInput(current.buildContractInput())
            // build next instance output
            .addOutput(
                new Transaction.Output({
                    script: nextInstance.lockingScript,
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
                    instance: nextInstance,
                    atOutputIndex: 0,
                    balance: Number(bid),
                },
            ],
        })
    }
}
