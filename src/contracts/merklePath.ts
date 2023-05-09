import { Sha256, SmartContractLib, method, prop, hash256 } from "scrypt-ts"
import { blob } from "stream/consumers"

type Node {
    hash : Sha256
    left : bigint
}
type MerkleProof = Node[MerklePath.DEPTH]

export class MerklePath extends SmartContractLib{
    @prop()
    static readonly DEPTH: bigint = 32n

    @prop()
    static readonly INVALID_NODE: bigint = 0n
    @prop()
    static readonly LEFT_NODE: bigint = 1n
    @prop()
    static readonly RIGHT_NODE: bigint = 2n
}
// no need for constructor since the @props are static


@method()
static calMerkleRoot(leaf : Sha256, merkleproof : MerkleProof) : Sha256{
    let root : Sha256 = leaf

    lookup(DEPTH) : i { 
        let node : Node = merkleproof[i]
        if (node.left != INVALID_NODE){
            root = node.left == LEFT_NODE ? hash256(node.hash + root) : hash256(root + node.hash)
        }
    }
    return root
}
@method()
static isCoinbase(merkleproof : MerkleProof) : bool { 
    let res : bool = true

    loop (DEPTH) : i {
        node : Node  = merkleproof[i]
        res = res && node.left == RIGHT_NODE
    }
}
return res
}