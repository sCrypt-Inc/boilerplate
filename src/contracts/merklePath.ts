import {
    prop,
    method,
    SmartContractLib,
    hash256,
    Sha256,
    FixedArray,
} from 'scrypt-ts'

export type Node = {
    hash: Sha256
    pos: bigint
}

export type MerkleProof = FixedArray<Node, 32> // If shorter than 32, pad with invalid nodes.

export class MerklePath extends SmartContractLib {
    @prop()
    static readonly DEPTH: bigint = 32n 

    @prop()
    static readonly INVALID_NODE: bigint = 0n

    @prop()
    static readonly LEFT_NODE: bigint = 1n

    @prop()
    static readonly RIGHT_NODE: bigint = 2n

    @method()
    static calcMerkleRoot(leaf: Sha256, merkleProof: MerkleProof): Sha256 {
        let root = leaf

        for (let i = 0; i < MerklePath.DEPTH; i++) {
            const node = merkleProof[i]
            if (node.pos != MerklePath.INVALID_NODE) {
                // s is valid
                root =
                    node.pos == MerklePath.LEFT_NODE
                        ? Sha256(hash256(node.hash + root))
                        : Sha256(hash256(root + node.hash))
            }
        }

        return root
    }

    // A tx is the blocks coinbase if all nodes on its Merkle path are on the right branch.
    @method()
    static isCoinbase(merkleproof: MerkleProof): boolean {
        let res = true
        for (let i = 0; i < MerklePath.DEPTH; i++) {
            const node = merkleproof[i]
            if (node.pos != MerklePath.INVALID_NODE) {
                // node on the right
                res = res && node.pos == MerklePath.RIGHT_NODE
            }
        }
        return res
    }
}
