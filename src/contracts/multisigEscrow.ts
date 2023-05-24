import {
    assert,
    FixedArray,
    method,
    prop,
    PubKeyHash,
    PubKey,
    SmartContract,
    Sig,
    hash160,
    SigHash,
    Utils,
    hash256,
} from 'scrypt-ts'

const LOCKTIME_BLOCK_HEIGHT_MARKER = 500000000
const UINT_MAX = 0xffffffffn

/*
 * An escrow contract where a list of arbitrators can resolve a dispute.
 */
export class MultiSigEscrow extends SmartContract {
    static readonly N_ARBITERS = 3

    @prop()
    readonly buyerAddr: PubKeyHash

    @prop()
    readonly sellerAddr: PubKeyHash

    @prop()
    readonly arbiters: FixedArray<PubKey, typeof MultiSigEscrow.N_ARBITERS>

    @prop()
    readonly deadline: bigint

    constructor(
        buyerAddr: PubKeyHash,
        sellerAddr: PubKeyHash,
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
            hash160(buyerPubKey) == this.buyerAddr,
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
            hash160(buyerPubKey) == this.buyerAddr,
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
            hash160(buyerPubKey) == this.buyerAddr,
            'invalid public key for buyer'
        )
        assert(
            this.checkSig(buyerSig, buyerPubKey),
            'buyer signature check failed'
        )

        // Require nLocktime enabled https://wiki.bitcoinsv.io/index.php/NLocktime_and_nSequence
        assert(this.ctx.sequence < UINT_MAX, 'require nLocktime enabled')

        // Check if using block height.
        if (this.deadline < LOCKTIME_BLOCK_HEIGHT_MARKER) {
            // Enforce nLocktime field to also use block height.
            assert(this.ctx.locktime < LOCKTIME_BLOCK_HEIGHT_MARKER)
        }
        assert(this.ctx.locktime >= this.deadline, 'deadline not yet reached')

        // Ensure buyer gets refund.
        const amount = this.ctx.utxo.value
        const out = Utils.buildPublicKeyHashOutput(this.buyerAddr, amount)
        assert(hash256(out) == this.ctx.hashOutputs, 'hashOutputs mismatch')
    }
}
