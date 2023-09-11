import {
    assert,
    ByteString,
    byteString2Int,
    hash256,
    len,
    method,
    slice,
    SmartContract,
    Utils,
} from 'scrypt-ts'

export class counterRaw extends SmartContract {
    // a example Counter contract than show how to custom states.
    static readonly DataLen: bigint = 1n

    @method()
    public increment(amount: bigint) {
        // deserialize state (i.e., counter value)
        const scriptCode: ByteString = this.ctx.utxo.script
        const scriptLen: bigint = len(scriptCode)
        // counter is at the end
        let counter: bigint = byteString2Int(
            slice(scriptCode, scriptLen - counterRaw.DataLen)
        )

        // increment counter
        counter++

        // serialize state
        const outputScript: ByteString = slice(
            scriptCode,
            scriptLen - counterRaw.DataLen
        )

        const output: ByteString = Utils.buildOutput(outputScript, amount)
        // ensure output is expected: amount is same with specified
        // also output script is the same with scriptCode except counter incremented
        assert(hash256(output) == this.ctx.hashOutputs)
    }
}
