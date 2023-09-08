import {
    assert,
    ByteString,
    hash256,
    method,
    prop,
    PubKeyHash,
    slice,
    SmartContract,
    Utils,
} from 'scrypt-ts'

export class Bsv20Counter extends SmartContract {
    @prop(true)
    count: bigint

    @prop()
    inscriptLen: bigint

    constructor(count: bigint, inscriptLen: bigint) {
        super(...arguments)
        this.count = count
        this.inscriptLen = inscriptLen
    }

    @method()
    public incrementOnChain() {
        // Increment counter value
        this.increment()

        // outputs containing the latest state and an optional change output
        const outputs: ByteString =
            this.buildStateOutput(1n) + this.buildChangeOutput()
        // verify unlocking tx has the same outputs
        assert(this.ctx.hashOutputs == hash256(outputs), 'hashOutputs mismatch')
    }

    @method()
    public withdraw(address: PubKeyHash) {
        // Increment counter value

        assert(this.count >= 3, 'count should >= 3')

        const stateScript = this.getStateScript()
        const inscriptionScript = slice(stateScript, 0n, this.inscriptLen)
        // outputs containing the latest state and an optional change output

        let outScript = Utils.buildPublicKeyHashScript(address)
        outScript += inscriptionScript
        const outputs: ByteString =
            Utils.buildOutput(outScript, 1n) + this.buildChangeOutput()
        // verify unlocking tx has the same outputs
        assert(this.ctx.hashOutputs == hash256(outputs), 'hashOutputs mismatch')
    }

    @method()
    increment(): void {
        this.count++
    }
}
