import {
    ByteString,
    len,
    method,
    OpCode,
    slice,
    SmartContractLib,
    toByteString,
    Utils,
    byteString2Int,
    VarIntWriter,
    assert,
    int2ByteString,
    PubKeyHash,
} from 'scrypt-ts'
import { Shift10 } from 'scrypt-ts-lib'

export class OrdinalLib extends SmartContractLib {
    @method()
    static skipBytes(b: ByteString): bigint {
        let len = 0n
        let ret = 0n
        const header: bigint = byteString2Int(slice(b, 0n, 1n))

        if (header < 0x4cn) {
            len = header
            ret = 1n + len
        } else if (header == 0x4cn) {
            len = Utils.fromLEUnsigned(slice(b, 1n, 2n))
            ret = 1n + 1n + len
        } else if (header == 0x4dn) {
            len = Utils.fromLEUnsigned(slice(b, 1n, 3n))
            ret = 1n + 2n + len
        } else if (header == 0x4en) {
            len = Utils.fromLEUnsigned(slice(b, 1n, 5n))
            ret = 1n + 4n + len
        } else {
            // shall not reach here
            ret = -1n
        }

        return ret
    }

    @method()
    static isP2PKHOrdinal(script: ByteString): boolean {
        return (
            len(script) > 25n &&
            OrdinalLib.isP2PKH(slice(script, 0n, 25n)) &&
            OrdinalLib.sizeOfOrdinal(slice(script, 25n)) > 0n
        )
    }

    @method()
    static isP2PKH(script: ByteString): boolean {
        return (
            len(script) === 25n &&
            slice(script, 0n, 3n) === toByteString('76a914') &&
            slice(script, 23n) === toByteString('88ac')
        )
    }

    @method()
    static removeInsciption(scriptCode: ByteString): ByteString {
        const inscriptLen = OrdinalLib.sizeOfOrdinal(scriptCode)

        if (inscriptLen > 0n) {
            scriptCode = slice(scriptCode, inscriptLen)
        }
        return scriptCode
    }

    @method()
    static getInsciptionScript(scriptCode: ByteString): ByteString {
        const inscriptLen = OrdinalLib.sizeOfOrdinal(scriptCode)
        let ret = toByteString('')
        if (inscriptLen > 0n) {
            ret = slice(scriptCode, 0n, inscriptLen)
        }
        return ret
    }

    @method()
    static buildTransferScript(
        tick: ByteString,
        address: PubKeyHash,
        amt: ByteString
    ): ByteString {
        const transferScript =
            Utils.buildPublicKeyHashScript(address) +
            OrdinalLib.createTransferInsciption(tick, amt)
        return transferScript
    }

    @method()
    static buildTransferOutput(
        tick: ByteString,
        address: PubKeyHash,
        amt: ByteString
    ): ByteString {
        const outputScript = OrdinalLib.buildTransferScript(tick, address, amt)
        return Utils.buildOutput(outputScript, 1n)
    }

    @method()
    static sizeOfOrdinal(script: ByteString): bigint {
        let ret = -1n
        let pos = 0n
        if (
            len(script) >= 11n &&
            slice(script, pos, 7n) === toByteString('0063036f726451')
        ) {
            pos += 7n
            const contentTypeLen = OrdinalLib.skipBytes(slice(script, pos))
            if (contentTypeLen > 0n) {
                pos += contentTypeLen
                if (slice(script, pos, pos + 1n) === OpCode.OP_0) {
                    pos += 1n
                    const contentLen = OrdinalLib.skipBytes(slice(script, pos))

                    if (contentLen > 0n) {
                        pos += contentLen
                        if (slice(script, pos, pos + 1n) === OpCode.OP_ENDIF) {
                            pos += 1n
                            ret = pos
                        }
                    }
                }
            }
        }
        return ret
    }

    @method()
    static createInsciption(
        content: ByteString,
        contentType: ByteString
    ): ByteString {
        return (
            OpCode.OP_FALSE +
            OpCode.OP_IF +
            VarIntWriter.writeBytes(toByteString('ord', true)) +
            OpCode.OP_1 +
            VarIntWriter.writeBytes(contentType) +
            OpCode.OP_FALSE +
            VarIntWriter.writeBytes(content) +
            OpCode.OP_ENDIF
        )
    }

    @method()
    static createMintInsciption(tick: ByteString, amt: ByteString): ByteString {
        const mintJSON =
            toByteString('{"p":"bsv-20","op":"mint","tick":"', true) +
            tick +
            toByteString('","amt":"', true) +
            amt +
            toByteString('"}', true)

        return OrdinalLib.createInsciption(
            mintJSON,
            toByteString('application/bsv-20', true)
        )
    }

    @method()
    static createTransferInsciption(
        tick: ByteString,
        amt: ByteString
    ): ByteString {
        const transferJSON =
            toByteString('{"p":"bsv-20","op":"transfer","tick":"', true) +
            tick +
            toByteString('","amt":"', true) +
            amt +
            toByteString('"}', true)
        return OrdinalLib.createInsciption(
            transferJSON,
            toByteString('application/bsv-20', true)
        )
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
