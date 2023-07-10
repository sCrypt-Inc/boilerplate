import {
    assert,
    ByteString,
    FixedArray,
    hash160,
    hash256,
    len,
    method,
    prop,
    PubKey,
    PubKeyHash,
    rshift,
    Sha256,
    Sig,
    slice,
    SmartContract,
    toByteString,
    Utils,
} from 'scrypt-ts'
import { MerklePath, MerkleProof } from 'scrypt-ts-lib'

// TODO: Import this from scrypt-ts-lib, once it includes it.
export type BlockHeader = {
    version: ByteString
    prevBlockHash: Sha256
    merkleRoot: Sha256
    time: bigint
    bits: ByteString // Difficulty target
    nonce: bigint
}

export type VarIntRes = {
    val: bigint
    newIdx: bigint
}

export class CrossChainSwap2 extends SmartContract {
    static readonly LOCKTIME_BLOCK_HEIGHT_MARKER = 500000000
    static readonly UINT_MAX = 0xffffffffn
    static readonly MIN_CONF = 3

    static readonly BTC_MAX_INPUTS = 3

    @prop()
    readonly aliceAddr: PubKeyHash

    @prop()
    readonly bobAddr: PubKeyHash

    @prop()
    readonly timeout: bigint // Can be a timestamp or block height.

    @prop()
    readonly targetDifficulty: bigint

    @prop()
    readonly amountBTC: bigint

    @prop()
    readonly amountBSV: bigint

    constructor(
        aliceAddr: PubKeyHash,
        bobAddr: PubKeyHash,
        timeout: bigint,
        targetDifficulty: bigint,
        amountBTC: bigint,
        amountBSV: bigint
    ) {
        super(...arguments)
        this.aliceAddr = aliceAddr
        this.bobAddr = bobAddr
        this.timeout = timeout
        this.targetDifficulty = targetDifficulty
        this.amountBTC = amountBTC
        this.amountBSV = amountBSV
    }

    @method()
    static parseVarInt(btcTx: ByteString, idx: bigint): VarIntRes {
        let res: VarIntRes = {
            val: 0n,
            newIdx: 0n,
        }
        const first = Utils.fromLEUnsigned(slice(btcTx, idx, idx + 1n))
        if (first < 0xfdn) {
            res = {
                val: first,
                newIdx: idx + 2n,
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
        } else {
            // 0xFF
            res = {
                val: Utils.fromLEUnsigned(slice(btcTx, idx + 1n, idx + 9n)),
                newIdx: idx + 9n,
            }
        }
        return res
    }

    @method()
    checkBtcTx(btcTx: ByteString): boolean {
        const res = false

        // TODO: Most things should be the same as in BSV except the witness data and flag.
        //       - Check (first) output is P2WPK to Bobs public key.
        //       - Check (first) output amount is equal to this.amountBTC

        let idx = 4n
        if (slice(btcTx, idx, idx + 2n) == toByteString('0001')) {
            // Witness flag present.
            idx += 2n
        }

        //// INPUTS:
        const inLen = CrossChainSwap2.parseVarInt(btcTx, idx)
        assert(
            inLen.val <= BigInt(CrossChainSwap2.BTC_MAX_INPUTS),
            'Number of inputs too large.'
        )
        idx = inLen.newIdx
        for (let i = 0n; i < CrossChainSwap2.BTC_MAX_INPUTS; i++) {
            if (i < inLen.val) {
                //const prevTxID = slice(btcTx, idx, idx + 32n)
                idx += 32n
                //const outIdx = slice(btcTx, idx, idx + 4n)
                idx += 4n
                const scriptLen = CrossChainSwap2.parseVarInt(btcTx, idx)
                idx = scriptLen.newIdx
                idx += scriptLen.val
                //const nSequence = slice(btcTx, idx, idx + 4n)
                idx += 4n
            }
        }

        //// FIRST OUTPUT:
        // Check if (first) output pays Alice the right amount and terminate and set res to true.
        const outLen = CrossChainSwap2.parseVarInt(btcTx, idx)
        idx = outLen.newIdx
        const amount = Utils.fromLEUnsigned(slice(btcTx, idx, idx + 8n))
        assert(amount == this.amountBTC, 'Invalid BTC output amount.')
        idx += 8n
        const scriptLen = CrossChainSwap2.parseVarInt(btcTx, idx)
        idx = scriptLen.newIdx
        const script = slice(btcTx, idx, scriptLen.val)
        assert(len(script) == 22n, 'Invalid locking script length.')
        assert(
            script == toByteString('0014') + this.aliceAddr,
            'Invalid locking script.'
        )

        // Data past this point is not relevant in our use-case.

        return res
    }

    @method()
    public swap(
        btcTx: ByteString,
        merkleProof: MerkleProof,
        headers: FixedArray<BlockHeader, typeof CrossChainSwap2.MIN_CONF>,
        alicePubKey: PubKey,
        aliceSig: Sig
    ) {
        // Check btc tx.
        assert(this.checkBtcTx(btcTx), 'BTC TX check failed.')

        // Calc merkle root.
        const txID = hash256(btcTx)
        const merkleRoot = MerklePath.calcMerkleRoot(txID, merkleProof)

        // Check if merkle root is included in the first BH.
        assert(
            merkleRoot == headers[0].merkleRoot,
            "Merkle root of proof doesn't match the one in the BH."
        )

        // Check target diff for headers.
        for (let i = 0; i < CrossChainSwap2.MIN_CONF; i++) {
            assert(
                CrossChainSwap2.isValidBH(headers[i], this.targetDifficulty),
                `${i}-nth BH doesn't meet target difficulty`
            )
        }

        // Check header chain.
        let h = CrossChainSwap2.hashBH(headers[0])
        for (let i = 1; i < CrossChainSwap2.MIN_CONF; i++) {
            const header = headers[i]
            // Check if prev block hash matches.
            assert(header.prevBlockHash == h, `${i}-th BH wrong prevBlockHash`)
            // Update header hash.
            h = CrossChainSwap2.hashBH(header)
        }

        // Verify Alices signature.
        assert(hash160(alicePubKey) == this.aliceAddr, 'Alice wrong pub key.')
        assert(this.checkSig(aliceSig, alicePubKey))
    }

    @method()
    public cancel(bobPubKey: PubKey, bobSig: Sig) {
        // Ensure nSequence is less than UINT_MAX.
        assert(
            this.ctx.sequence < CrossChainSwap2.UINT_MAX,
            'input sequence should less than UINT_MAX'
        )

        // Check if using block height.
        if (this.timeout < CrossChainSwap2.LOCKTIME_BLOCK_HEIGHT_MARKER) {
            // Enforce nLocktime field to also use block height.
            assert(
                this.ctx.locktime <
                    CrossChainSwap2.LOCKTIME_BLOCK_HEIGHT_MARKER,
                'locktime should be less than 500000000'
            )
        }
        assert(
            this.ctx.locktime >= this.timeout,
            'locktime has not yet expired'
        )

        // Verify Bobs signature.
        assert(hash160(bobPubKey) == this.bobAddr, 'Bob wrong pub key.')
        assert(this.checkSig(bobSig, bobPubKey))
    }

    // TODO: Import functions below from 'scrypt-ts-lib' once ready.

    // Serialize a block header.
    @method()
    static serializeBH(bh: BlockHeader): ByteString {
        return (
            bh.version +
            bh.prevBlockHash +
            bh.merkleRoot +
            Utils.toLEUnsigned(bh.time, 4n) +
            bh.bits +
            Utils.toLEUnsigned(bh.nonce, 4n)
        )
    }

    // Convert difficulty from bits to target.
    @method()
    static bits2Target(bits: ByteString): bigint {
        const exponent = Utils.fromLEUnsigned(bits.slice(6))
        const coefficient = Utils.fromLEUnsigned(bits.slice(0, 6))
        const n = 8n * (exponent - 3n)
        return rshift(coefficient, n)
    }

    // Block header hash.
    @method()
    static hashBH(bh: BlockHeader): Sha256 {
        return Sha256(hash256(CrossChainSwap2.serializeBH(bh)))
    }

    // Block header hash, but converted to a positive integer.
    @method()
    static hashBH2Int(bh: BlockHeader): bigint {
        return Utils.fromLEUnsigned(CrossChainSwap2.hashBH(bh))
    }

    // Is block header valid with difficulty meeting target.
    @method()
    static isValidBH(bh: BlockHeader, blockchainTarget: bigint): boolean {
        const bhHash = CrossChainSwap2.hashBH2Int(bh)
        const target = CrossChainSwap2.bits2Target(bh.bits)
        // Block hash below target and target below blockchain difficulty target.
        return bhHash <= target && target <= blockchainTarget
    }
}
