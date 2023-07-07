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

// cross chain atomic swap https://xiaohuiliu.medium.com/cross-chain-atomic-swaps-f13e874fcaa7
export class CrossChainSwap extends SmartContract {
    static readonly LOCKTIME_BLOCK_HEIGHT_MARKER = 500000000
    static readonly UINT_MAX = 0xffffffffn

    @prop()
    readonly alicePubKey: PubKey

    @prop()
    readonly bobPubKey: PubKey

    @prop()
    readonly hashX: Sha256

    @prop()
    readonly timeout: bigint // Can be a timestamp or block height.

    constructor(
        alicePubKey: PubKey,
        bobPubKey: PubKey,
        hashX: Sha256,
        timeout: bigint
    ) {
        super(...arguments)
        this.alicePubKey = alicePubKey
        this.bobPubKey = bobPubKey
        this.hashX = hashX
        this.timeout = timeout
    }

    @method()
    public unlock(x: ByteString, aliceSig: Sig) {
        // Check if H(x) == this.hashX
        assert(sha256(x) == this.hashX, 'Invalid secret.')

        // Verify Alices signature.
        assert(this.checkSig(aliceSig, this.alicePubKey))
    }

    @method()
    public cancel(bobSig: Sig) {
        // Ensure nSequence is less than UINT_MAX.
        assert(
            this.ctx.sequence < CrossChainSwap.UINT_MAX,
            'input sequence should less than UINT_MAX'
        )

        // Check if using block height.
        if (this.timeout < CrossChainSwap.LOCKTIME_BLOCK_HEIGHT_MARKER) {
            // Enforce nLocktime field to also use block height.
            assert(
                this.ctx.locktime < CrossChainSwap.LOCKTIME_BLOCK_HEIGHT_MARKER,
                'locktime should be less than 500000000'
            )
        }
        assert(
            this.ctx.locktime >= this.timeout,
            'locktime has not yet expired'
        )

        // Verify Bobs signature.
        assert(this.checkSig(bobSig, this.bobPubKey))
    }
}
