import {
    assert,
    hash256,
    int2ByteString,
    method,
    Sig,
    SigHash,
    slice,
    SmartContract,
    len,
    byteString2Int,
    prop,
} from 'scrypt-ts'

export class LogicalUTXO extends SmartContract {
    static readonly LOGICAL_UTXO_SIZE = 3

    @prop(true)
    dummyStateProp: bigint

    constructor() {
        super(...arguments)
        this.dummyStateProp = 0n
    }

    @method(SigHash.SINGLE)
    public unlock() {
        // Get prevouts array and verify it.
        const prevouts = this.prevouts
        assert(
            hash256(prevouts) == this.ctx.hashPrevouts,
            'hashPrevouts mismatch'
        )

        // The prevout of the current input which is being executed.
        const currentPrevout =
            this.ctx.utxo.outpoint.txid +
            int2ByteString(this.ctx.utxo.outpoint.outputIndex, 4n) // TODO: Check endian

        for (let i = 0; i < LogicalUTXO.LOGICAL_UTXO_SIZE; i++) {
            const start = BigInt(i) * 36n
            const end = start + 36n
            const prevout = slice(prevouts, start, end)

            // TODO: Move this outside the loop, so script can be smaller?
            // Within the prevouts array, find the prevout for the currently executed input.
            if (prevout == currentPrevout) {
                const currentPrevoutTXID = slice(currentPrevout, 0n, 32n)
                const currentPrevoutOutputIndex = byteString2Int(
                    slice(currentPrevout, 32n, 36n)
                )

                const isFirstInput = i == 0
                const isLastInput = i == LogicalUTXO.LOGICAL_UTXO_SIZE - 1
                const isMiddleInput = !isFirstInput && !isLastInput

                if (isFirstInput || isMiddleInput) {
                    // If the first or an in-between input is being executed, check the subsequent input is unlocking
                    // the subsequent output index from the same transaction.
                    const nextPrevout = slice(prevouts, end, end + 36n)
                    const nextPrevoutTXID = slice(nextPrevout, 0n, 32n)
                    const nextPrevoutOutputIndex = byteString2Int(
                        slice(nextPrevout, 32n, 36n)
                    )
                    assert(
                        currentPrevoutTXID == nextPrevoutTXID,
                        'next input TXID mismatch'
                    )
                    assert(
                        nextPrevoutOutputIndex ==
                            currentPrevoutOutputIndex + 1n,
                        'next input not unlocking subsequent output idx'
                    )
                }

                if (isLastInput || isMiddleInput) {
                    // If the last or an in-between input is being executed, check the prior input is unlocking
                    // the prior output index from the same transaction.
                    const prevPrevout = slice(prevout, start - 36n, start)
                    const prevPrevoutTXID = slice(prevPrevout, 0n, 32n)
                    const prevPrevoutOutputIndex = byteString2Int(
                        slice(prevPrevout, 32n, 36n)
                    )
                    assert(
                        prevPrevoutTXID == currentPrevoutTXID,
                        'previous input TXID mismatch'
                    )
                    assert(
                        prevPrevoutOutputIndex ==
                            currentPrevoutOutputIndex - 1n,
                        'previous input not unlocking prior output idx'
                    )
                }
            }
        }

        // Propagate contract.
        const outputs = this.buildStateOutput(this.ctx.utxo.value)
        assert(hash256(outputs) == this.ctx.hashOutputs, 'hashOutputs mismatch')
    }
}
