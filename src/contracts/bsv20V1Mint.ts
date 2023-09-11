import {
    assert,
    ByteString,
    hash256,
    method,
    PubKeyHash,
    SigHash,
    SmartContract,
    Utils,
    prop,
} from 'scrypt-ts'
import { OrdinalLib } from './ordinalLib'

/*
 * A demonstration of a contract that simply clones itself to the next output.
 */
export class Bsv20V1Mint extends SmartContract {
    @prop()
    tick: ByteString

    @prop()
    totalSupply: bigint

    @prop(true)
    totalMinted: bigint

    constructor(tick: ByteString, totalSupply: bigint) {
        super(...arguments)
        this.tick = tick
        this.totalSupply = totalSupply
        this.totalMinted = 0n
    }

    // see https://scrypt.io/scrypt-ts/getting-started/what-is-scriptcontext#sighash-type
    @method(SigHash.ALL)
    public mint(address: PubKeyHash, amtStr: ByteString) {
        // make sure balance in the contract does not change
        const amount: bigint = this.ctx.utxo.value

        const amt = OrdinalLib.parseInt(amtStr)

        assert(amt <= 100n)

        this.totalMinted += amt

        assert(this.totalMinted <= this.totalSupply)

        const oneSatOutput = OrdinalLib.buildTransferOutput(
            this.tick,
            address,
            amtStr
        )

        const insciption = OrdinalLib.createTransferInsciption(
            this.tick,
            OrdinalLib.int2Str(this.remainingAmt())
        )

        const stateScript =
            insciption + OrdinalLib.removeInsciption(this.getStateScript())

        // output containing the latest state
        const outputs: ByteString =
            Utils.buildOutput(stateScript, amount) +
            oneSatOutput +
            this.buildChangeOutput()
        this.debug.diffOutputs(outputs)
        // verify current tx has this single output
        assert(this.ctx.hashOutputs == hash256(outputs), 'hashOutputs mismatch')
    }

    @method()
    remainingAmt(): bigint {
        return this.totalSupply - this.totalMinted
    }
}
