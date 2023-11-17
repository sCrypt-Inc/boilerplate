import { BSV20V2 } from 'scrypt-ord'
import {
    ByteString,
    PubKey,
    Addr,
    Sig,
    Utils,
    hash256,
    method,
    prop,
    slice,
    pubKey2Addr,
    assert,
    len,
    byteString2Int,
    toByteString,
} from 'scrypt-ts'
import { RabinPubKey, RabinSig, RabinVerifier } from 'scrypt-ts-lib'

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
    public buy(amount: bigint, buyerAddr: Addr) {
        // Check token amount doesn't exceed total.
        assert(
            this.tokenAmtSold + amount < this.tokenAmt,
            'insufficient tokens left in the contract'
        )

        // Update cleared amount.
        this.tokenAmtSold += amount

        // Build transfer inscription.
        const transferInscription = BSV20V2.createTransferInsciption(
            this.id,
            amount
        )
        const transferInscriptionLen = len(transferInscription)

        // Fist output is the contract itself, holding the remaining tokens.
        // If no tokens are remaining, then terminate the contract
        const tokensRemaining = this.tokenAmt - this.tokenAmtSold
        let outputs = toByteString('')
        if (tokensRemaining > 0n) {
            outputs = this.buildStateOutput(1n)
        }

        // Ensure the sold tokens are being payed out to the buyer.
        outputs += BSV20V2.buildTransferOutput(
            pubKey2Addr(this.seller),
            this.id,
            amount
        )

        // Ensure the next output is paying the to the Bitcoin to the buyer.
        const satsForBuyer = this.pricePerUnit * amount
        outputs += Utils.buildPublicKeyHashOutput(buyerAddr, satsForBuyer)

        // Add change output.
        outputs += this.buildChangeOutput()

        // Check outputs.
        assert(hash256(outputs) == this.ctx.hashOutputs, 'hashOutputs mismatch')
    }

    @method()
    public cancel(buyerSig: Sig) {
        assert(this.checkSig(buyerSig, this.seller))
    }
}
