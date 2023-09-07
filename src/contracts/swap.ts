import {
    assert,
    ByteString,
    method,
    prop,
    PubKey,
    sha256,
    Sha256,
    Sig,
    SmartContract,
} from 'scrypt-ts'

// This contract can both be utilized as an atomic swap on the same chain
// or as a cross-chain atomic swap.
// https://xiaohuiliu.medium.com/cross-chain-atomic-swaps-f13e874fcaa7
export class AtomicSwap extends SmartContract {
    static readonly LOCKTIME_BLOCK_HEIGHT_MARKER = 500000000
    static readonly UINT_MAX = 0xffffffffn

    @prop()
    readonly receiver: PubKey

    @prop()
    readonly sender: PubKey

    @prop()
    readonly hashX: Sha256

    @prop()
    readonly timeout: bigint // Can be a timestamp or block height.

    constructor(
        receiver: PubKey,
        sender: PubKey,
        hashX: Sha256,
        timeout: bigint
    ) {
        super(...arguments)
        this.receiver = receiver
        this.sender = sender
        this.hashX = hashX
        this.timeout = timeout
    }

    @method()
    public unlock(x: ByteString, receiverSig: Sig) {
        // Check if H(x) == this.hashX
        assert(sha256(x) == this.hashX, 'Invalid secret.')

        // Verify Alices signature.
        assert(this.checkSig(receiverSig, this.receiver))
    }

    @method()
    public cancel(senderSig: Sig) {
        // Ensure nSequence is less than UINT_MAX.
        assert(
            this.ctx.sequence < AtomicSwap.UINT_MAX,
            'input sequence should less than UINT_MAX'
        )

        // Check if using block height.
        if (this.timeout < AtomicSwap.LOCKTIME_BLOCK_HEIGHT_MARKER) {
            // Enforce nLocktime field to also use block height.
            assert(
                this.ctx.locktime < AtomicSwap.LOCKTIME_BLOCK_HEIGHT_MARKER,
                'locktime should be less than 500000000'
            )
        }
        assert(
            this.ctx.locktime >= this.timeout,
            'locktime has not yet expired'
        )

        // Verify Bobs signature.
        assert(this.checkSig(senderSig, this.sender))
    }
}
