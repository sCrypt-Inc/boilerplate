import {
    assert,
    byteString2Int,
    hash256,
    method,
    prop,
    SigHash,
    slice,
    SmartContract,
} from 'scrypt-ts'

export class Bsv20LendingPoolCollateral extends SmartContract {
    @prop(true)
    amt: bigint

    constructor(amt: bigint) {
        super(...arguments)
        this.amt = amt
    }

    @method(SigHash.SINGLE)
    public increment(newAmt: bigint) {
        // Update amt prop.
        this.amt = newAmt

        // Make sure first input spends main contract.
        const prevTxId = this.ctx.utxo.outpoint.txid
        const prevoutContract = slice(this.prevouts, 0n, 36n)
        assert(slice(prevoutContract, 0n, 32n) == prevTxId)
        assert(byteString2Int(slice(prevoutContract, 32n, 36n)) == 0n)

        // Propagate contract.
        const output = this.buildStateOutput(this.amt)
        assert(hash256(output) == this.ctx.hashOutputs, 'hashOutputs mismatch')
    }
}
