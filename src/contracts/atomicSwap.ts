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
        // Check timeout.
        assert(this.timeLock(this.timeout), 'time lock not yet expired')

        // Verify Bobs signature.
        assert(this.checkSig(senderSig, this.sender))
    }
}
