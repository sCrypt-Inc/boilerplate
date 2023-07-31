import {
    prop,
    method,
    SmartContractLib,
    hash256,
    Sha256,
    Utils,
    ByteString,
    toByteString,
    assert,
    slice,
    lshift,
} from 'scrypt-ts'
import { MerkleProof, MerklePath } from './merklePath'

export type BlockHeader = {
    version: ByteString
    prevBlockHash: Sha256
    merkleRoot: Sha256
    time: bigint
    bits: ByteString // Difficulty target
    nonce: bigint
}

export class Blockchain extends SmartContractLib {
    // Block height's position relative to the beginning of coinbase tx.
    // TODO: This assumes unlocking script can be pushed using OP_PUSH_1. See if it always holds?
    @prop()
    static readonly BLOCK_HEIGHT_POS: bigint = 42n

    // SPV: Is a txid in a block
    @method()
    static txInBlock(
        txid: Sha256,
        bh: BlockHeader,
        merkleProof: MerkleProof
    ): boolean {
        return MerklePath.calcMerkleRoot(txid, merkleProof) == bh.merkleRoot
    }

    // Is txid the last transaction in a block
    @method()
    static lastTxInBlock(
        txid: Sha256,
        bh: BlockHeader,
        merkleProof: MerkleProof
    ): boolean {
        let last = true
        let root = txid

        for (let i = 0; i < MerklePath.DEPTH; i++) {
            const node = merkleProof[i]

            if (node.pos != MerklePath.INVALID_NODE) {
                // IF LAST ELEMENT:
                // - A non-duplicate node cannot ever be on the right.
                const isDuplicate = node.hash == root
                if (!isDuplicate && node.pos == MerklePath.RIGHT_NODE) {
                    last = false
                }

                root = Sha256(
                    node.pos == MerklePath.LEFT_NODE
                        ? hash256(node.hash + root)
                        : hash256(root + node.hash)
                )
            }
        }

        return last && root == bh.merkleRoot
    }

  

    // Is block header valid with difficulty meeting target.
    @method()
    static isValidBlockHeader(
        bh: BlockHeader,
        blockchainTarget: bigint
    ): boolean {
        const bhHash = Blockchain.blockHeaderHashAsInt(bh)
        const target = Blockchain.bits2Target(bh.bits)
        // Block hash below target and target below blockchain difficulty target.
        return bhHash <= target && target <= blockchainTarget
    }

    // Is a chain of block headers valid.
    // TODO

    // Is raw transaction a coinbase tx.
    @method()
    static isCoinbase(tx: ByteString): boolean {
        return (
            slice(tx, 4n, 5n) == toByteString('01') && // only 1 input
            slice(tx, 5n, 37n) ==
                toByteString(
                    '0000000000000000000000000000000000000000000000000000000000000000'
                ) && // null txid: all zeros
            slice(tx, 37n, 41n) == toByteString('ffffffff')
        ) // null vout: all Fs
    }

    // Get height of the block identified by the header.
    @method()
    static blockHeight(
        bh: BlockHeader,
        coinbaseTx: ByteString,
        merkleProof: MerkleProof
    ): bigint {
        // Ensure coinbase it's in the block.
        assert(
            Blockchain.txInBlock(Sha256(hash256(coinbaseTx)), bh, merkleProof)
        )

        // Ensure it's the coinbase.
        assert(MerklePath.isCoinbase(merkleProof))

        return Blockchain.readBlockHeight(coinbaseTx)
    }

    // Parse block height from coinbase tx: BIP34
    @method()
    static readBlockHeight(coinbaseTx: ByteString): bigint {
        // Block height is at the beginning of the unlocking script and encoded in varint.
        return Utils.fromLEUnsigned(
            Utils.readVarint(slice(coinbaseTx, Blockchain.BLOCK_HEIGHT_POS))
        )
    }

    // Convert difficulty from bits to target.
    @method()
    static bits2Target(bits: ByteString): bigint {
        const exponent = Utils.fromLEUnsigned(slice(bits, 3n))
        const coefficient = Utils.fromLEUnsigned(slice(bits, 0n, 3n))
        const n = 8n * (exponent - 3n)
        return lshift(coefficient, n)
    }

    // Serialize a block header.
    @method()
    static serialize(bh: BlockHeader): ByteString {
        return (
            bh.version +
            bh.prevBlockHash +
            bh.merkleRoot +
            Utils.toLEUnsigned(bh.time, 4n) +
            bh.bits +
            Utils.toLEUnsigned(bh.nonce, 4n)
        )
    }

    // Block header hash.
    @method()
    static blockHeaderHash(bh: BlockHeader): Sha256 {
        return hash256(Blockchain.serialize(bh))
    }

    // Block header hash, but converted to a positive integer.
    @method()
    static blockHeaderHashAsInt(bh: BlockHeader): bigint {
        return Utils.fromLEUnsigned(Blockchain.blockHeaderHash(bh))
    }
}
