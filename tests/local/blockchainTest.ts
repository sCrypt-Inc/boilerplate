import { ByteString, FixedArray, Sha256, SmartContract, assert, method } from "scrypt-ts";
import { BlockHeader, Blockchain } from "../../src/contracts/blockchain";
import { MerkleProof } from "../../src/contracts/merklePath";

export class BlockchainTest extends SmartContract{

    @method()
    public testBlockHeight(
        bh : BlockHeader, 
        merkleproof : MerkleProof, 
        coinbaseTx : ByteString, 
        expectedHeight : bigint){
        assert(Blockchain.blockHeight(bh, coinbaseTx, merkleproof) == expectedHeight)
    }

    @method()
    public testIsBlockHeaderValid(
        bh : BlockHeader, 
        blockchainTarget : bigint){
            assert(Blockchain.isValidBlockHeader(bh, blockchainTarget))
        }

        @method()
        public testIstxInBlock(
            txid: Sha256,
        bh: BlockHeader,
        merkleProof: MerkleProof
        ){
            assert(Blockchain.txInBlock(txid, bh, merkleProof))
        }
        
}