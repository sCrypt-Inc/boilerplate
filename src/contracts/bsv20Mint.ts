import { assert } from 'console'
import {
    ByteString,
    OpCode,
    Addr,
    SmartContract,
    Utils,
    byteString2Int,
    hash256,
    int2ByteString,
    len,
    method,
    prop,
    slice,
    toByteString,
} from 'scrypt-ts'

export class BSV20Mint extends SmartContract {
    @prop(true)
    supply: bigint

    @prop()
    maxMintAmount: bigint

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

    // Hex representation of bytes 0-255
    @prop()
    static readonly hexAsciiTable: ByteString = toByteString(
        '000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f202122232425262728292a2b2c2d2e2f303132333435363738393a3b3c3d3e3f404142434445464748494a4b4c4d4e4f505152535455565758595a5b5c5d5e5f606162636465666768696a6b6c6d6e6f707172737475767778797a7b7c7d7e7f808182838485868788898a8b8c8d8e8f909192939495969798999a9b9c9d9e9fa0a1a2a3a4a5a6a7a8a9aaabacadaeafb0b1b2b3b4b5b6b7b8b9babbbcbdbebfc0c1c2c3c4c5c6c7c8c9cacbcccdcecfd0d1d2d3d4d5d6d7d8d9dadbdcdddedfe0e1e2e3e4e5e6e7e8e9eaebecedeeeff0f1f2f3f4f5f6f7f8f9fafbfcfdfeff',
        true
    )

    constructor(
        supply: bigint,
        maxMintAmount: bigint,
        lastUpdate: bigint,
        timeDelta: bigint,
        prevInscriptionLen: bigint
    ) {
        super(...arguments)
        this.supply = supply
        this.maxMintAmount = maxMintAmount
        this.tokenId = toByteString('')
        this.lastUpdate = lastUpdate
        this.timeDelta = timeDelta
        this.prevInscriptionLen = prevInscriptionLen
    }

    @method()
    public mint(dest: Addr, amount: bigint) {
        // Check time passed since last mint.
        assert(
            this.timeLock(this.lastUpdate + this.timeDelta),
            'time lock not yet expired'
        )

        // Update last mint timestamp.
        this.lastUpdate = this.ctx.locktime

        // Check mint amount doesn't exceed maximum.
        assert(amount <= this.maxMintAmount, 'mint amount exceeds maximum')

        // If first mint, parse token id and store it in a state var
        if (this.tokenId == toByteString('')) {
            this.tokenId =
                BSV20Mint.txidToAscii(this.ctx.utxo.outpoint.txid) +
                toByteString('_', true) +
                BSV20Mint.intToAscii(this.ctx.utxo.outpoint.outputIndex)
        }

        // Update supply.
        this.supply -= amount

        // If there are still tokens left, then
        // build state output inscribed with leftover tokens.
        let outputs = toByteString('')
        if (this.supply > 0n) {
            const transferInscription = BSV20Mint.buildTransferInsciption(
                this.tokenId,
                this.supply
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
        const destScript =
            BSV20Mint.buildTransferInsciption(this.tokenId, amount) +
            Utils.buildPublicKeyHashScript(dest)
        outputs += Utils.buildOutput(destScript, 1n)

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
    static buildTransferInsciption(
        tokenId: ByteString,
        amt: bigint
    ): ByteString {
        const json: ByteString =
            toByteString('{"p":"bsv-20","op":"transfer","id":"', true) +
            tokenId +
            toByteString('","amt":"', true) +
            BSV20Mint.intToAscii(amt) +
            toByteString('"}', true)
        return (
            // OP_FALSE OP_IF OP_DATA3 "ord" OP_1 OP_DATA18 "application/bsv-20" OP_0
            toByteString(
                '0063036f726451126170706c69636174696f6e2f6273762d323000'
            ) +
            OpCode.OP_PUSHDATA1 +
            int2ByteString(len(json)) +
            json +
            OpCode.OP_ENDIF
        )
    }

    // Converts integer to hex-encoded ASCII.
    // 1000 -> '31303030'
    // Input cannot be larger than 2^64-1.
    @method()
    static intToAscii(num: bigint): ByteString {
        assert(
            num >= 0n && num < 18446744073709551616n,
            'value must be uint64 ' + num
        )
        let ascii = toByteString('', true)
        let done = false
        for (let i = 0; i < 20; i++) {
            if (!done) {
                const char = (num % 10n) + 48n
                ascii = int2ByteString(char) + ascii
                if (num > 9n) {
                    num = num / 10n
                } else {
                    done = true
                }
            }
        }
        return ascii
    }

    @method()
    static txidToAscii(txId: ByteString): ByteString {
        let res = toByteString('')
        for (let i = 0n; i < 32n; i++) {
            const bytePos = 31n - i
            const byte = slice(txId, bytePos, bytePos + 1n)
            const hexPos = byteString2Int(byte + toByteString('00')) * 2n
            res += slice(BSV20Mint.hexAsciiTable, hexPos, hexPos + 2n)
        }
        return res
    }
}
