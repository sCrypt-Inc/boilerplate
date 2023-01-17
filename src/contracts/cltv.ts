import { method, prop, SmartContract, assert, bsv, UTXO } from 'scrypt-ts'

export class CheckLockTimeVerify extends SmartContract {
    @prop()
    matureTime: bigint // Can be timestamp or block height.

    constructor(matureTime: bigint) {
        super(matureTime)
        this.matureTime = matureTime
    }

    @method()
    public unlock() {
        // Ensure nSequence is less than UINT_MAX.
        assert(this.ctx.sequence < 4294967295n)

        // Check if using block height.
        if (this.matureTime < 500000000) {
            // Enforce nLocktime field to also use block height.
            assert(this.ctx.locktime < 500000000)
        }
        assert(this.ctx.locktime >= this.matureTime)
    }

    getDeployTx(utxos: UTXO[], satoshis: number): bsv.Transaction {
        return new bsv.Transaction().from(utxos).addOutput(
            new bsv.Transaction.Output({
                script: this.lockingScript,
                satoshis: satoshis,
            })
        )
    }

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
                cloned.unlockFrom = { tx, inputIndex }
                cloned.ctx.locktime = BigInt(timeNow)
                cloned.ctx.sequence = 0n
                cloned.unlock()
            })
        })

        return callTx
    }
}
