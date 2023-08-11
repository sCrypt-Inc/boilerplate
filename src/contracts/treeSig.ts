import { ByteString, FixedArray, PubKey, Sha256, Sig, SmartContract, assert, method, prop, sha256, toByteString } from "scrypt-ts";
import { MerklePath, MerkleProof } from 'scrypt-ts-lib';

// tree signatures: Merkle tree-based multisig
export class TreeSig extends SmartContract{


    // M out of N multisig
    static readonly M : bigint = 3n;
    
    @prop()
    readonly merkleRoot : Sha256;

    constructor(merkleRoot : Sha256){
        super(...arguments)
        this.merkleRoot = merkleRoot
    }

    @method()
    public main(pubKeys : FixedArray<PubKey, 3>, sigs : FixedArray<Sig, 3> , merkleproof : MerkleProof) {
        // validate public keys are from the merkle tree
        assert(MerklePath.calcMerkleRoot(TreeSig.pubKeys2Leaf(pubKeys), merkleproof) == this.merkleRoot);

        // check if all M signatures are valid
        let allMatch :boolean = true;
        for (let i = 0; i < 3; i ++) {
            allMatch = allMatch && this.checkMultiSig(sigs, pubKeys);
        }
        assert(allMatch);
    }

    // map public keys to a leaf
    @method()
    static pubKeys2Leaf(pubKeys : FixedArray<PubKey, 3>) : Sha256 {
        let leaf : ByteString = toByteString('');

        for (let i = 0; i < 3; i ++)  {
            leaf += pubKeys[i];
        }
        return sha256(leaf);
    }
}
