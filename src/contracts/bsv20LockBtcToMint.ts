import { Hash } from 'crypto'
import { BSV20V2 } from 'scrypt-ord'
import {
    Addr,
    assert,
    ByteString,
    FixedArray,
    hash160,
    hash256,
    HashedSet,
    int2ByteString,
    method,
    prop,
    slice,
    toByteString,
    Utils,
} from 'scrypt-ts'
import { Blockchain, BlockHeader, MerklePath, MerkleProof } from 'scrypt-ts-lib'

export type Bsv20LockBtcToMint_VarIntRes = {
    val: bigint
    newIdx: bigint
}

export class Bsv20LockBtcToMint extends BSV20V2 {
    static readonly MIN_CONF = 3
    static readonly BTC_MAX_INPUTS = 3

    @prop(true)
    supply: bigint

    // Amount of sats (BTC) to lock up in order to mint a single token.
    @prop()
    hodlRate: bigint

    // Minimum deadline until you have to lock to mint new
    // tokens.
    @prop()
    hodlDeadline: bigint

    @prop()
    btcHtlcScriptSuffix: ByteString

    @prop()
    targetDifficulty: bigint

    @prop(true)
    usedAddresses: HashedSet<Addr>

    constructor(
        id: ByteString,
        sym: ByteString,
        max: bigint,
        dec: bigint,
        supply: bigint,
        hodlRate: bigint,
        hodlDeadline: bigint,
        btcHtlcScriptSuffix: ByteString,
        targetDifficulty: bigint,
        usedAddresses: HashedSet<Addr>
    ) {
        super(id, sym, max, dec)
        this.init(...arguments)

        this.supply = supply
        this.hodlRate = hodlRate
        this.hodlDeadline = hodlDeadline
        this.btcHtlcScriptSuffix = btcHtlcScriptSuffix
        this.targetDifficulty = targetDifficulty
        this.usedAddresses = usedAddresses
    }

    @method()
    public mint(
        ordinalAddress: Addr,
        lockAddress: Addr,
        amount: bigint,
        btcTx: ByteString,
        merkleProof: MerkleProof,
        headers: FixedArray<BlockHeader, typeof Bsv20LockBtcToMint.MIN_CONF>
    ) {
        // Check lock address was not yet used. This is to avoid replay
        // attacks where the same BTC tx would be used to mint multiple times.
        assert(
            !this.usedAddresses.has(lockAddress),
            'lock address already used'
        )
        this.usedAddresses.add(lockAddress)

        let outputs = toByteString('')
        let transferAmt = amount

        if (this.supply > transferAmt) {
            // If there are still tokens left, then update supply and
            // build state output inscribed with leftover tokens.
            this.supply -= transferAmt
            outputs += this.buildStateOutputFT(this.supply)
        } else {
            // If not, then transfer all the remaining supply.
            transferAmt = this.supply
        }

        // Check btc tx.
        this.checkBtcTx(btcTx, lockAddress, transferAmt * this.hodlRate)

        // Calc merkle root.
        const txID = hash256(btcTx)
        const merkleRoot = MerklePath.calcMerkleRoot(txID, merkleProof)

        // Check if merkle root is included in the first BH.
        assert(
            merkleRoot == headers[0].merkleRoot,
            "Merkle root of proof doesn't match the one in the BH."
        )

        // Check target diff for headers.
        for (let i = 0; i < Bsv20LockBtcToMint.MIN_CONF; i++) {
            assert(
                Blockchain.isValidBlockHeader(
                    headers[i],
                    this.targetDifficulty
                ),
                `${i}-nth BH doesn't meet target difficulty`
            )
        }

        // Check header chain.
        let h = Blockchain.blockHeaderHash(headers[0])
        for (let i = 0; i < Bsv20LockBtcToMint.MIN_CONF; i++) {
            if (i >= 1n) {
                const header = headers[i]
                // Check if prev block hash matches.
                assert(
                    header.prevBlockHash == h,
                    `${i}-th BH wrong prevBlockHash`
                )
                // Update header hash.
                h = Blockchain.blockHeaderHash(header)
            }
        }

        // Build FT P2PKH output paying specified amount of tokens.
        outputs += BSV20V2.buildTransferOutput(
            ordinalAddress,
            this.id,
            transferAmt
        )

        // Build change output.
        outputs += this.buildChangeOutput()

        assert(hash256(outputs) == this.ctx.hashOutputs, 'hashOutputs mismatch')
    }

    @method()
    checkBtcTx(btcTx: ByteString, lockAddress: Addr, amount: bigint): void {
        // Most things should be the same as in BSV except the witness data and flag.
        // - Check (first) output is a P2SH to a HTLC script with the specified lock address.
        // - Check (first) output amount is correct.

        let idx = 4n

        // Make sure to serialize BTC tx without witness data.
        // See https://github.com/karask/python-bitcoin-utils/blob/a41c7a1e546985b759e6eb2ae4524f466be809ca/bitcoinutils/transactions.py#L913
        assert(
            slice(btcTx, idx, idx + 2n) != toByteString('0001'),
            'Witness data present. Please serialize without witness data.'
        )

        //// INPUTS:
        const inLen = Bsv20LockBtcToMint.parseVarInt(btcTx, idx)
        assert(
            inLen.val <= BigInt(Bsv20LockBtcToMint.BTC_MAX_INPUTS),
            'Number of inputs too large.'
        )
        idx = inLen.newIdx
        for (let i = 0n; i < Bsv20LockBtcToMint.BTC_MAX_INPUTS; i++) {
            if (i < inLen.val) {
                //const prevTxID = slice(btcTx, idx, idx + 32n)
                idx += 32n
                //const outIdx = slice(btcTx, idx, idx + 4n)
                idx += 4n
                const scriptLen = Bsv20LockBtcToMint.parseVarInt(btcTx, idx)
                idx = scriptLen.newIdx
                idx += scriptLen.val
                //const nSequence = slice(btcTx, idx, idx + 4n)
                idx += 4n
            }
        }

        //// FIRST OUTPUT:
        // Check first outputs amount is correct and that it's a P2SH to the correct HTLC script.
        const outLen = Bsv20LockBtcToMint.parseVarInt(btcTx, idx)
        idx = outLen.newIdx
        const outAmt = Utils.fromLEUnsigned(slice(btcTx, idx, idx + 8n))
        assert(outAmt == amount, 'output amount invalid')
        idx += 8n
        const scriptLen = Bsv20LockBtcToMint.parseVarInt(btcTx, idx)
        idx = scriptLen.newIdx
        const script = slice(btcTx, idx, idx + scriptLen.val)

        const btcHtlcScriptFinal =
            lockAddress +
            int2ByteString(this.hodlDeadline, 4n) +
            this.btcHtlcScriptSuffix
        const expectedScript =
            toByteString('a9') +
            hash160(btcHtlcScriptFinal) +
            toByteString('87')
        assert(script == expectedScript, 'locking script invalid')

        // Data past this point is not relevant in our use-case.
    }

    @method()
    static parseVarInt(
        btcTx: ByteString,
        idx: bigint
    ): Bsv20LockBtcToMint_VarIntRes {
        let res: Bsv20LockBtcToMint_VarIntRes = {
            val: 0n,
            newIdx: idx, // In case its 0x00, just continue from this index on.
        }
        const first = Utils.fromLEUnsigned(slice(btcTx, idx, idx + 1n))
        if (first < 0xfdn) {
            res = {
                val: first,
                newIdx: idx + 1n,
            }
        } else if (first == 0xfdn) {
            res = {
                val: Utils.fromLEUnsigned(slice(btcTx, idx + 1n, idx + 3n)),
                newIdx: idx + 3n,
            }
        } else if (first == 0xfen) {
            res = {
                val: Utils.fromLEUnsigned(slice(btcTx, idx + 1n, idx + 5n)),
                newIdx: idx + 5n,
            }
        } else if (first == 0xffn) {
            res = {
                val: Utils.fromLEUnsigned(slice(btcTx, idx + 1n, idx + 9n)),
                newIdx: idx + 9n,
            }
        }
        return res
    }
}
