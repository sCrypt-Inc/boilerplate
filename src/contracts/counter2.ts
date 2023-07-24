// A contract that will update that is increase, decrease and reset the count value.
import {
    assert,
    ByteString,
    hash256,
    method,
    prop,
    SigHash,
    SmartContract,
} from 'scrypt-ts'

/*
 * See this documentation page for a full explanation on how this contract works:
 * https://docs.scrypt.io/how-to-write-a-contract/stateful-contract
 */
export class Counter2 extends SmartContract {
    // Stateful prop to store counters value.
    @prop(true)
    count: bigint

    constructor(count: bigint) {
        super(...arguments)
        this.count = count
    }

    @method()
    increment(): void {
        this.count++
    }

    @method()
    reset(): void {
        this.count = 0n
    }
    @method()
    decreament(): void {
        this.count--
    }

    // ANYONECANPAY_SINGLE is used here to ignore all inputs and outputs, other than the ones contains the state
    // see https://scrypt.io/scrypt-ts/getting-started/what-is-scriptcontext#sighash-type
    @method(SigHash.ANYONECANPAY_SINGLE)
    public incrementOnChain() {
        // Increment counter value
        this.increment()

        // make sure balance in the contract does not change
        const amount: bigint = this.ctx.utxo.value
        // output containing the latest state
        const output: ByteString = this.buildStateOutput(amount)
        // verify unlocking tx has this single output
        assert(this.ctx.hashOutputs == hash256(output), 'hashOutputs mismatch')
    }

    @method(SigHash.ANYONECANPAY_SINGLE)
    public resetOnChain() {
        // reset counter value
        this.reset()

        // make sure balance in the contract does not change
        const amount: bigint = this.ctx.utxo.value
        // output containing the latest state
        const output: ByteString = this.buildStateOutput(amount)
        // verify unlocking tx has this single output
        assert(this.ctx.hashOutputs == hash256(output), 'hashOutputs mismatch')
    }

    @method(SigHash.ANYONECANPAY_SINGLE)
    public decreamentOnChain() {
        // reset counter value
        this.decreament()

        // make sure balance in the contract does not change
        const amount: bigint = this.ctx.utxo.value
        // output containing the latest state
        const output: ByteString = this.buildStateOutput(amount)
        // verify unlocking tx has this single output
        assert(this.ctx.hashOutputs == hash256(output), 'hashOutputs mismatch')
    }
}
