import { assert } from 'console'
import {
    ByteString,
    FixedArray,
    OpCode,
    PubKeyHash,
    SmartContract,
    Utils,
    byteString2Int,
    hash256,
    int2ByteString,
    len,
    lshift,
    method,
    prop,
    slice,
    toByteString,
} from 'scrypt-ts'
import { Shift10 } from 'scrypt-ts-lib'

export class BSV20Mint extends SmartContract {
    @prop()
    totalSupply: bigint

    @prop(true)
    alreadyMinted: bigint

    @prop(true)
    isFirstMint: boolean

    @prop(true)
    tokenId: ByteString

    @prop()
    static readonly hexAsciiTable: FixedArray<ByteString, 16> = [
        toByteString('0', true),
        toByteString('1', true),
        toByteString('2', true),
        toByteString('3', true),
        toByteString('4', true),
        toByteString('5', true),
        toByteString('6', true),
        toByteString('7', true),
        toByteString('8', true),
        toByteString('9', true),
        toByteString('a', true),
        toByteString('b', true),
        toByteString('c', true),
        toByteString('d', true),
        toByteString('e', true),
        toByteString('f', true),
    ]

    constructor(totalSupply: bigint) {
        super(...arguments)
        this.totalSupply = totalSupply
        this.alreadyMinted = 0n
        this.isFirstMint = false
        this.tokenId = toByteString('')
    }

    @method()
    public mint(dest: PubKeyHash, amount: bigint) {
        // If first mint, parse token id and store it in a state var
        if (this.isFirstMint) {
            this.tokenId =
                BSV20Mint.txId2Ascii(this.ctx.utxo.outpoint.txid) +
                toByteString('_', true) +
                BSV20Mint.int2Ascii(this.ctx.utxo.outpoint.outputIndex)
            this.isFirstMint = false
        }

        // Check if tokens still available.
        assert(
            this.totalSupply - this.alreadyMinted >= amount,
            'not enough tokens left to mint'
        )

        // Update already minted amount.
        this.alreadyMinted += amount

        // Build state output inscribed with leftover tokens.
        const leftover = this.totalSupply - this.alreadyMinted
        const script0 =
            BSV20Mint.getTransferInsciption(this.tokenId, leftover) +
            this.getStateScript()
        let outputs = Utils.buildOutput(script0, 1n)

        // Build P2PKH output to dest paying specified amount of tokens.
        const script1 =
            BSV20Mint.getTransferInsciption(this.tokenId, leftover) +
            Utils.buildPublicKeyHashScript(dest)
        outputs += Utils.buildOutput(script1, 1n)

        // Build change output.
        outputs += this.buildChangeOutput()

        assert(hash256(outputs) == this.ctx.hashOutputs, 'hashOutputs mismatch')
    }

    // OP_FALSE OP_IF OP_DATA3 "ord" OP_1 OP_DATA18 "application/bsv-20" OP_FALSE <transfer-json> OP_ENDIF
    // Transfer JSON example:
    //{ 
    //  "p": "bsv-20",
    //  "op": "transfer",
    //  "id": "3b313338fa0555aebeaf91d8db1ffebd74773c67c8ad5181ff3d3f51e21e0000_1"
    //  "amt": "10000"
    //}
    @method()
    static getTransferInsciption(tokenId: ByteString, amt: bigint): ByteString {
        const transferJson =
            toByteString("{\"p\":\"bsv-20\",\"op\":\"transfer\",\"id\":\"", true) +
            toByteString("\",\"amt\":\"", true) +
            BSV20Mint.int2Ascii(amt) +
            toByteString("\"}", true)

        return (
           toByteString(
                '0063036f726451126170706c69636174696f6e2f6273762d323000'
            ) +
            int2ByteString(len(transferJson)) +
            transferJson +
            OpCode.OP_ENDIF
        )
    }

    // Converts integer to hex-encoded ASCII.
    // 1000 -> '31303030'
    // Input cannot be larger than 2^64-1.
    @method()
    static int2Ascii(n: bigint): ByteString {
        // Max 2^64-1
        assert(n < lshift(1n, 64n), 'n is larger than 2^64-1')

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

    @method()
    static txId2Ascii(txId: ByteString): ByteString {
        let res = toByteString('')

        for (let i = 0; i < 64; i++) {
            const char = slice(txId, BigInt(i), BigInt(i + 1))
            const charInt = byteString2Int(char)
            res += BSV20Mint.hexAsciiTable[Number(charInt)]
        }
        return res
    }
}
