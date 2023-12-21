import { BSV20V2, Ordinal } from 'scrypt-ord'
import {
    ByteString,
    PubKey,
    Sig,
    Utils,
    hash256,
    method,
    prop,
    pubKey2Addr,
    assert,
    toByteString,
    hash160,
    MethodCallOptions,
    ContractTransaction,
    bsv,
    Addr,
    StatefulNext,
} from 'scrypt-ts'

/**
 * Sell order for BSV-20 tokens. Can be partially sold.
 */
export class BSV20SellLimitOrder extends BSV20V2 {
    // Total amount of tokens we're selling.
    @prop()
    readonly tokenAmt: bigint

    // Amount of tokens already sold.
    @prop(true)
    tokenAmtSold: bigint

    // The seller's public key.
    @prop()
    seller: PubKey

    // Asking price per BSV-20 token unit.
    @prop()
    pricePerUnit: bigint

    constructor(
        id: ByteString,
        sym: ByteString,
        max: bigint,
        dec: bigint,
        tokenAmt: bigint,
        seller: PubKey,
        pricePerUnit: bigint
    ) {
        super(id, sym, max, dec)
        this.init(...arguments)

        this.tokenAmt = tokenAmt
        this.tokenAmtSold = 0n
        this.seller = seller
        this.pricePerUnit = pricePerUnit
    }

    @method()
    public buy(amount: bigint, buyer: Addr) {
        // Check token amount doesn't exceed total.
        assert(
            this.tokenAmtSold + amount < this.tokenAmt,
            'insufficient tokens left in the contract'
        )

        // Update cleared amount.
        this.tokenAmtSold += amount

        // Fist output is the contract itself, holding the remaining tokens.
        // If no tokens are remaining, then terminate the contract
        const tokensRemaining = this.tokenAmt - this.tokenAmtSold
        let outputs = toByteString('')
        if (tokensRemaining > 0n) {
            outputs = this.buildStateOutputFT(tokensRemaining)
        }

        // Ensure the sold tokens are being payed out to the buyer.
        outputs += BSV20V2.buildTransferOutput(buyer, this.id, amount)

        // Ensure the next output is paying the Bitcoin to the seller.
        const satsForSeller = this.pricePerUnit * amount
        outputs += Utils.buildPublicKeyHashOutput(
            pubKey2Addr(this.seller),
            satsForSeller
        )

        // Add change output.
        outputs += this.buildChangeOutput()

        // Check outputs.
        assert(hash256(outputs) == this.ctx.hashOutputs, 'hashOutputs mismatch')
    }

    @method()
    public cancel(buyerSig: Sig) {
        assert(this.checkSig(buyerSig, this.seller))
    }

    static async buyTxBuilder(
        current: BSV20SellLimitOrder,
        options: MethodCallOptions<BSV20SellLimitOrder>,
        amount: bigint,
        buyer: Addr
    ): Promise<ContractTransaction> {
        const defaultAddress = await current.signer.getDefaultAddress()

        const next = current.next()
        next.tokenAmtSold += amount
        const tokensRemaining = next.tokenAmt - next.tokenAmtSold

        next.setAmt(tokensRemaining)

        const tx = new bsv.Transaction().addInput(current.buildContractInput())

        if (tokensRemaining > 0n) {
            const stateOut = new bsv.Transaction.Output({
                script: next.lockingScript,
                satoshis: 1,
            })
            tx.addOutput(stateOut)
        }
        const buyerOut = BSV20SellLimitOrder.buildTransferOutput(
            buyer,
            next.id,
            amount
        )
        tx.addOutput(
            bsv.Transaction.Output.fromBufferReader(
                new bsv.encoding.BufferReader(Buffer.from(buyerOut, 'hex'))
            )
        )

        const satsForSeller = next.pricePerUnit * amount
        const paymentOut = new bsv.Transaction.Output({
            script: bsv.Script.fromHex(
                Utils.buildPublicKeyHashScript(pubKey2Addr(next.seller))
            ),
            satoshis: Number(satsForSeller),
        })
        tx.addOutput(paymentOut)

        tx.change(options.changeAddress || defaultAddress)

        return {
            tx,
            atInputIndex: 0,
            nexts: [
                {
                    instance: next,
                    balance: 1,
                    atOutputIndex: 0,
                } as StatefulNext<BSV20SellLimitOrder>,
            ],
        }
    }
}
