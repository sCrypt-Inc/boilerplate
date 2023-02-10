import { method, prop, SmartContract, assert, bsv, UTXO } from 'scrypt-ts'

export class CheckLockTimeVerify extends SmartContract {
    public static readonly LOCKTIME_BLOCK_HEIGHT_MARKER = 500000000

    @prop()
    readonly matureTime: bigint // Can be a timestamp or block height.

    constructor(matureTime: bigint) {
        super(matureTime)
        this.matureTime = matureTime
    }

    @method()
    public unlock() {
        // Ensure nSequence is less than UINT_MAX.
        assert(this.ctx.sequence < 0xffffffffn)

        // Check if using block height.
        if (
            this.matureTime < CheckLockTimeVerify.LOCKTIME_BLOCK_HEIGHT_MARKER
        ) {
            // Enforce nLocktime field to also use block height.
            assert(
                this.ctx.locktime <
                    CheckLockTimeVerify.LOCKTIME_BLOCK_HEIGHT_MARKER
            )
        }
        assert(this.ctx.locktime >= this.matureTime)
    }

    // Local method to construct deployment TX.
    getDeployTx(utxos: UTXO[], satoshis: number): bsv.Transaction {
        return new bsv.Transaction().from(utxos).addOutput(
            new bsv.Transaction.Output({
                script: this.lockingScript,
                satoshis: satoshis,
            })
        )
    }

    // Local method to construct TX that calls deployed contract.
    getCallTxForUnlock(
        timeNow: number,
        prevTx: bsv.Transaction
    ): bsv.Transaction {
        const inputIndex = 0
        let callTx: bsv.Transaction = new bsv.Transaction().addInputFromPrevTx(
            prevTx
        )

        callTx.setLockTime(timeNow)
        callTx.setInputSequence(inputIndex, 0)

        callTx = callTx.setInputScript(inputIndex, (tx: bsv.Transaction) => {
            return this.getUnlockingScript((cloned) => {
                // Call cloned contract's public method to get the unlocking script.
                cloned.to = { tx, inputIndex }
                cloned.unlock()
            })
        })

        return callTx
    }
}
