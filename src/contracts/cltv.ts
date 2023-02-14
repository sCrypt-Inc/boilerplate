import { assert, method, prop, SmartContract } from 'scrypt-ts'

export class CheckLockTimeVerify extends SmartContract {
    static readonly LOCKTIME_BLOCK_HEIGHT_MARKER = 500000000
    static readonly UINT_MAX = 0xffffffffn

    @prop()
    readonly matureTime: bigint // Can be a timestamp or block height.

    constructor(matureTime: bigint) {
        super(matureTime)
        this.matureTime = matureTime
    }

    @method()
    public unlock() {
        // Ensure nSequence is less than UINT_MAX.
        assert(
            this.ctx.sequence < CheckLockTimeVerify.UINT_MAX,
            'input sequence should less than UINT_MAX'
        )

        // Check if using block height.
        if (
            this.matureTime < CheckLockTimeVerify.LOCKTIME_BLOCK_HEIGHT_MARKER
        ) {
            // Enforce nLocktime field to also use block height.
            assert(
                this.ctx.locktime <
                    CheckLockTimeVerify.LOCKTIME_BLOCK_HEIGHT_MARKER,
                'locktime should be less than 500000000'
            )
        }
        assert(
            this.ctx.locktime >= this.matureTime,
            'locktime has not yet expired'
        )
    }
}
