import {
    assert,
    FixedArray,
    method,
    prop,
    Addr,
    PubKey,
    SmartContract,
    Sig,
    SigHash,
    Utils,
    hash256,
    pubKey2Addr,
} from 'scrypt-ts'

/*
 * An escrow contract where a list of arbitrators can resolve a dispute.
 */
export class MultiSigEscrow extends SmartContract {
    static readonly N_ARBITERS = 3

    @prop()
    readonly buyerAddr: Addr

    @prop()
    readonly sellerAddr: Addr

    @prop()
    readonly arbiters: FixedArray<PubKey, typeof MultiSigEscrow.N_ARBITERS>

    @prop()
    readonly deadline: bigint

    constructor(
        buyerAddr: Addr,
        sellerAddr: Addr,
        arbiters: FixedArray<PubKey, typeof MultiSigEscrow.N_ARBITERS>,
        deadline: bigint
    ) {
        super(...arguments)
        this.buyerAddr = buyerAddr
        this.sellerAddr = sellerAddr
        this.arbiters = arbiters
        this.deadline = deadline
    }

    // Buyer and arbiters confirm, that the item was delivered.
    // Seller gets paid.
    @method(SigHash.ANYONECANPAY_SINGLE)
    public confirmPayment(
        buyerSig: Sig,
        buyerPubKey: PubKey,
        arbiterSigs: FixedArray<Sig, typeof MultiSigEscrow.N_ARBITERS>
    ) {
        // Validate buyer sig.
        assert(
            pubKey2Addr(buyerPubKey) == this.buyerAddr,
            'invalid public key for buyer'
        )
        assert(
            this.checkSig(buyerSig, buyerPubKey),
            'buyer signature check failed'
        )

        // Validate arbiter sigs.
        assert(
            this.checkMultiSig(arbiterSigs, this.arbiters),
            'arbiters checkMultiSig failed'
        )

        // Ensure seller gets payed.
        const amount = this.ctx.utxo.value
        const out = Utils.buildPublicKeyHashOutput(this.sellerAddr, amount)
        assert(hash256(out) == this.ctx.hashOutputs, 'hashOutputs mismatch')
    }

    // Regular refund. Needs arbiters agreement.
    @method()
    public refund(
        buyerSig: Sig,
        buyerPubKey: PubKey,
        arbiterSigs: FixedArray<Sig, typeof MultiSigEscrow.N_ARBITERS>
    ) {
        // Validate buyer sig.
        assert(
            pubKey2Addr(buyerPubKey) == this.buyerAddr,
            'invalid public key for buyer'
        )
        assert(
            this.checkSig(buyerSig, buyerPubKey),
            'buyer signature check failed'
        )

        // Validate arbiter sigs.
        assert(
            this.checkMultiSig(arbiterSigs, this.arbiters),
            'arbiters checkMultiSig failed'
        )

        // Ensure buyer gets refund.
        const amount = this.ctx.utxo.value
        const out = Utils.buildPublicKeyHashOutput(this.buyerAddr, amount)
        assert(hash256(out) == this.ctx.hashOutputs, 'hashOutputs mismatch')
    }

    // Deadline for delivery. If reached, the  buyer gets refunded.
    @method()
    public refundDeadline(buyerSig: Sig, buyerPubKey: PubKey) {
        assert(
            pubKey2Addr(buyerPubKey) == this.buyerAddr,
            'invalid public key for buyer'
        )
        assert(
            this.checkSig(buyerSig, buyerPubKey),
            'buyer signature check failed'
        )

        // Check deadline.
        assert(this.timeLock(this.deadline), 'deadline not yet reached')

        // Ensure buyer gets refund.
        const amount = this.ctx.utxo.value
        const out = Utils.buildPublicKeyHashOutput(this.buyerAddr, amount)
        assert(hash256(out) == this.ctx.hashOutputs, 'hashOutputs mismatch')
    }
}
