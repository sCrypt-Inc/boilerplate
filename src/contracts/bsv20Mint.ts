import { assert } from 'console'
import {
    ByteString,
    FixedArray,
    OpCode,
    Addr,
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
    static readonly LOCKTIME_BLOCK_HEIGHT_MARKER = 500000000
    static readonly UINT_MAX = 0xffffffffn

    @prop()
    totalSupply: bigint

    @prop()
    maxMintAmount: bigint

    @prop(true)
    alreadyMinted: bigint

    @prop(true)
    isFirstMint: boolean

    @prop(true)
    tokenId: ByteString

    @prop(true)
    lastUpdate: bigint

    @prop()
    timeDelta: bigint

    @prop(true)
    prevInscriptionLen: bigint

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

    constructor(
        totalSupply: bigint,
        maxMintAmount: bigint,
        lastUpdate: bigint,
        timeDelta: bigint,
        prevInscriptionLen: bigint
    ) {
        super(...arguments)
        this.totalSupply = totalSupply
        this.maxMintAmount = maxMintAmount
        this.alreadyMinted = 0n
        this.isFirstMint = false
        this.tokenId = toByteString('')
        this.lastUpdate = lastUpdate
        this.timeDelta = timeDelta
        this.prevInscriptionLen = prevInscriptionLen
    }

    @method()
    public mint(dest: Addr, amount: bigint) {
        // Check time passed since last mint.
        // Ensure nSequence is less than UINT_MAX.
        assert(
            this.ctx.sequence < BSV20Mint.UINT_MAX,
            'input sequence should less than UINT_MAX'
        )

        // Check if using block height.
        if (
            this.lastUpdate + this.timeDelta <
            BSV20Mint.LOCKTIME_BLOCK_HEIGHT_MARKER
        ) {
            // Enforce nLocktime field to also use block height.
            assert(
                this.ctx.locktime < BSV20Mint.LOCKTIME_BLOCK_HEIGHT_MARKER,
                'locktime should be less than 500000000'
            )
        }
        assert(
            this.ctx.locktime >= this.lastUpdate + this.timeDelta,
            'locktime has not yet expired'
        )

        // Update last mint timestamp.
        this.lastUpdate = this.ctx.locktime

        // Check mint amount doesn't exceed maximum.
        assert(amount <= this.maxMintAmount, 'mint amount exceeds maximum')

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

        let outputs = toByteString('')

        if (this.alreadyMinted != this.totalSupply) {
            // If there are still tokens left, then
            // build state output inscribed with leftover tokens.
            const leftover = this.totalSupply - this.alreadyMinted
            const transferInscription = BSV20Mint.getTransferInsciption(
                this.tokenId,
                leftover
            )
            const stateScript = slice(
                this.getStateScript(),
                this.prevInscriptionLen
            ) // Slice prev inscription
            outputs += Utils.buildOutput(transferInscription + stateScript, 1n)

            // Store next inscription length, so we know how much to slice in the next iteration.
            this.prevInscriptionLen = len(transferInscription)
        }

        // Build P2PKH output to dest paying specified amount of tokens.
        const script1 =
            BSV20Mint.getTransferInsciption(this.tokenId, amount) +
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
            toByteString('{"p":"bsv-20","op":"transfer","id":"', true) +
            toByteString('","amt":"', true) +
            BSV20Mint.int2Ascii(amt) +
            toByteString('"}', true)

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
