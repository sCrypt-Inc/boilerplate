import { ByteString, Sha256, SmartContractLib, method} from 'scrypt-ts'
import 'util.ts'
import 'merklePath.ts'
import { Node } from 'typescript'

type BlockHeader {
    version : ByteString
    prevBlockHash : Sha256
    merkleRoot : Sha256
    time : bigint
    // target difficulty
    bits : ByteString
    nonce : bigint
}

export class Blockchain extends SmartContractLib{
    static readonly BLOCK_HEIGHT_POS : bigint = 42

    @method()
    static lastTxInBlock(txid : Sha256, bh : BlockHeader, merkleproof : MerkleProof) : bool {
        let last : bool = true
        let root : Sha256 = txid


        loop (MerklePath.DEPTH) : i {
            let node : Node = merkleproof[i]
            if (node.left != MerklePath.INVALID_NODE){

            }
        }

    }
    @method()
    static txIndex(merkleproof : MerkleProof) : int{
        let sum : bigint = 0n
        loop(MerklePath.DEPTH) : i {
            let node : Node = merkleproof[MerklePath  .DEPTH - i - 1n]
            if (node.left != MerklePath.INVALID_NODE){
                sum *= 2n
                if (node.left == MerklePath.LEFT_NODE){
                    sum ++
                }
            }
            
        }
        return sum
    }
    @method()
    static blockTxCount(bh : BlockHeader, lastTxid : Sha256, merkleproof : MerkleProof) : bigint{
        assert(lastTxInBlock(lastTxid,bh,merkleproof))
        return txIndex(merkleproof) + 1n
    }
    // is BlockHeader valid
    @method()
    static isBlockHeaderValid(bh : BlockHeader, blockchainTarget : bigint) : bool {
        let bhHash : bigint = blochHeaderHashAsbigint(bh)
        let target : bigint = bits2Target(bh.bits)
        let hash : ByteString = blochHeaderHash(bh)
        return bhHash <= target && <= blockchainTarget
    }
    @method()
    static isBlockHeaderChainValid(static readonly N : bigint, headers : BlockHeader[N], blockchainTarget : bigint) : bool{
        let res : bool = true
        loop (N) : i {
            if (res){
                if (!isBlockHeaderValid(headers[i], blockchainTarget))
                res = false
                if (i > 0n){
                    let prevBlockHash : Sha256 = blochHeaderHash(headers[i - 1n])
                    if (prevBlockHash != headers[i].prevBlockHash)
                    res = false
                }
            }
        }
        return res
    }
    @method()
    static isCoinbase(tx : ByteString) : bool{
        return tx[4:5] == b'01' && tx [5:37] == b'0000000000000000000000000000000000000000000000000000000000000000' && tx [37:41] == b'FFFFFFFF'
    }
    @method()
    static blockHeight(bh : BlockHeader, coinbaseTx : ByteString, merkleproof: MerkleProof) : bigint{
        assert(txInBlock(hash256(coinbaseTx), bh, merkleproof))
        //ensure its coinbaseTx
        assert(merklePath.isCoinbase(merkleproof))
        //alternative
        assert(isCoinbase(merkleproof))
       return readBlockHeight(coinbaseTx)
    }
    @method()
    static readBlockHeight(coinbaseTx : ByteString) : bigint{
        return Utils.fromLEUnsigned(Utils.readVarint(coinbaseTx[BLOCK_HEIGHT_POS:]))
    }
    //conver difficulty from bjts to target
    @method()
    static bits2Target(bits : ByteString) : bigint{
        let exponent : bigint = Utils.fromLEUnsigned(bits[3:])
        let coefficient : bigint = Utils.fromLEUnsigned(bits[:3])
        let n : bigint = 8n * (exponent - 3n)
        let target : ByteString = num2bin(coefficient, 32n) > n
       return Utils.fromLEUnsigned(target) 
        
    }
    //serialize a block headers
    @method()
    static serialize(bh : BlockHeader) : ByteString{
       return bh.version + bh.prevBlockHash + bh.merkleRoot + Utils.toLEUnsigned(bh.time, 4n) + bh.bits + Utils.toLEUnsigned(bh.nonce, 4n)
    }
    @method()
    static blochHeaderHash(bh : BlockHeader) : Sha256{
        return hash256(serialize(bh))
    }
    // blochHeaderHash but converted
    @method()
    static blochHeaderHashAsbigint(bh : BlockHeader) : bigint{
        return Utils.fromLEUnsigned(blochHeaderHash(bh))
    }
}