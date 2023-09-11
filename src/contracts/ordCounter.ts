import {
    assert,
    ByteString,
    hash256,
    method,
    prop,
    PubKeyHash,
    SmartContract,
    Utils,
} from 'scrypt-ts'
import { OrdinalLib } from './ordinalLib'

export class OrdCounter extends SmartContract {
    @prop(true)
    count: bigint

    constructor(count: bigint) {
        super(...arguments)
        this.count = count
    }

    @method()
    public incrementOnChain() {
        // Increment counter value
        this.increment()

        const stateScript = OrdinalLib.removeInsciption(this.getStateScript())
        // outputs containing the latest state and an optional change output
        const outputs: ByteString =
            Utils.buildOutput(stateScript, 1n) + this.buildChangeOutput()
        // verify unlocking tx has the same outputs
        assert(this.ctx.hashOutputs == hash256(outputs), 'hashOutputs mismatch')
    }

    @method()
    public withdraw(address: PubKeyHash) {
        // Increment counter value

        assert(this.count >= 3, 'count should >= 3')

        const outputs: ByteString =
            Utils.buildPublicKeyHashOutput(address, 1n) +
            this.buildChangeOutput()
        // verify unlocking tx has the same outputs
        assert(this.ctx.hashOutputs == hash256(outputs), 'hashOutputs mismatch')
    }

    @method()
    increment(): void {
        this.count++
    }
}
