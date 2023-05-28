import {
    assert,
    ByteString,
    hash256,
    method,
    SigHash,
    SmartContract,
    Utils,
} from 'scrypt-ts'

/*
 * A demonstration of a contract that simply clones itself to the next output.
 */
export class Clone extends SmartContract {
    constructor() {
        super(...arguments)
    }

    // see https://scrypt.io/scrypt-ts/getting-started/what-is-scriptcontext#sighash-type
    @method(SigHash.SINGLE)
    public unlock() {
        // make sure balance in the contract does not change
        const amount: bigint = this.ctx.utxo.value
        const scriptCode: ByteString = this.ctx.utxo.script
        // output containing the latest state
        const output: ByteString = Utils.buildOutput(scriptCode, amount)
        // verify current tx has this single output
        assert(this.ctx.hashOutputs == hash256(output), 'hashOutputs mismatch')
    }
}
