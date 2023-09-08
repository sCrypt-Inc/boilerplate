import {
    assert,
    ByteString,
    hash256,
    len,
    method,
    OpCode,
    PubKeyHash,
    SigHash,
    SmartContract,
    toByteString,
    Utils,
    int2ByteString,
    slice,
    prop,
    byteString2Int,
} from 'scrypt-ts'
import { Shift10 } from 'scrypt-ts-lib'

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

    @method()
    transferOutput(address: PubKeyHash, amt: ByteString): ByteString {
        const outputScript =
            Utils.buildPublicKeyHashScript(address) +
            this.getTransferInsciption(amt)
        return Utils.buildOutput(outputScript, 1n)
    }

    @method()
    getTransferInsciption(amt: ByteString): ByteString {
        const transferJSON =
            toByteString('{"p":"bsv-20","op":"transfer","tick":"', true) +
            this.tick +
            toByteString('","amt":"', true) +
            amt +
            toByteString('"}', true)

        return (
            OpCode.OP_FALSE +
            OpCode.OP_IF +
            toByteString('03') +
            toByteString('ord', true) +
            OpCode.OP_1 +
            toByteString('12') +
            toByteString('application/bsv-20', true) +
            OpCode.OP_FALSE +
            int2ByteString(len(transferJSON)) +
            transferJSON +
            OpCode.OP_ENDIF
        )
    }

    // see https://scrypt.io/scrypt-ts/getting-started/what-is-scriptcontext#sighash-type
    @method(SigHash.ALL)
    public mint(
        address: PubKeyHash,
        amtStr: ByteString,
        inscriptionLen: bigint
    ) {
        // make sure balance in the contract does not change
        const amount: bigint = this.ctx.utxo.value

        const amt = Bsv20V1Mint.parseInt(amtStr)

        assert(amt <= 100n)

        this.totalMinted += amt

        assert(this.totalMinted <= this.totalSupply)

        const oneSatOutput = this.transferOutput(address, amtStr)

        let stateScript = this.getStateScript()

        stateScript =
            this.getTransferInsciption(
                Bsv20V1Mint.int2Str(this.remainingAmt())
            ) + slice(stateScript, inscriptionLen)

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

    @method()
    static parseInt(s: ByteString): bigint {
        let n = 0n

        const l = len(s)
        for (let i = 0n; i < 20; i++) {
            if (i < l) {
                const char = slice(s, i, i + 1n)
                const c = byteString2Int(char)
                assert(c >= 48n && c <= 57n)
                n = n * 10n + (c - 48n)
            }
        }

        return n
    }

    // Converts integer to hex-encoded ASCII.
    // 1000 -> '31303030'
    // Input cannot be larger than 2^64-1.
    @method()
    static int2Str(n: bigint): ByteString {
        // Max 2^64-1
        assert(n < 18446744073709551616n, 'n is larger than 2^64-1')

        let res = toByteString('')
        let done = false

        for (let i = 0; i < 20; i++) {
            if (!done) {
                // Get ith digit: n // 10^i % 10
                const denominator = Shift10.pow(BigInt(i))

                if (n < denominator) {
                    done = true
                } else {
                    const ithDigit = (n / denominator) % 10n

                    // Transform digit to ASCII (hex encoded) and prepend to result.
                    res = int2ByteString(48n + ithDigit, 1n) + res
                }
            }
        }

        return res
    }
}
