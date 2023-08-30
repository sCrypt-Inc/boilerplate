import { ByteString, Sha256, SmartContract, assert, method, prop } from "scrypt-ts";
import { BlockHeader, Blockchain, MerkleProof} from 'scrypt-ts-lib';


// relative locktime, aka, OP_CheckSequenceVerify https://en.bitcoin.it/wiki/Timelock#CheckSequenceVerify
export class CheckSequenceVerify extends SmartContract{
    // relative timelock: specified in either unix time or block height
    @prop()
    relativeTime : bigint;

    @prop()
    // maximal target for any block to be considered valid
    blockchainTarget : bigint;

				constructor(relativeTime : bigint, blockchainTarget : bigint){
			super(...arguments)
			this.relativeTime = relativeTime
			this.blockchainTarget = blockchainTarget

		}
    // unlock based on unix timestamp
    @method()
    public unlockWithTime(utxoBh : BlockHeader, latestBh : BlockHeader, merkleproof : MerkleProof) {
        this.validateHelper(utxoBh, latestBh, merkleproof);

        // enough time has elapsed since the UTXO is mined
        assert(latestBh.time - utxoBh.time >= this.relativeTime);
    }

    // unlock based on block height
    @method()
    public unlockWithBlockHeight(utxoBh : BlockHeader, latestBh : BlockHeader, 
                                 utxoMerkleproof : MerkleProof,latestMerkleproof : MerkleProof,
                                 utxoCoinbaseTx : ByteString, latestCoinbaseTx : ByteString, merkleproof : MerkleProof) {
        this.validateHelper(utxoBh, latestBh, merkleproof);

        // get block height from header
        let utxoBlockHeight : bigint = Blockchain.blockHeight(utxoBh, utxoCoinbaseTx, utxoMerkleproof);
        let latestBlockHeight : bigint= Blockchain.blockHeight(latestBh, latestCoinbaseTx, latestMerkleproof);

        assert(latestBlockHeight - utxoBlockHeight >= this.relativeTime);
    }

    // common validation for both relative timelock: Unix timestamp and block height
    // @utxoBh: block header containing the UTXO containing the contract
    // @latestBh: latest block header
    @method()
    validateHelper(utxoBh : BlockHeader, latestBh : BlockHeader, merkleproof : MerkleProof) : boolean {
        
        // get id of previous tx
        let prevTxid : Sha256= Sha256(this.ctx.utxo.outpoint.txid);
        // verify previous tx is in the block
        assert(Blockchain.txInBlock(prevTxid, utxoBh, merkleproof));

        // validate block headers
        assert(Blockchain.isValidBlockHeader(utxoBh, this.blockchainTarget));
        assert(Blockchain.isValidBlockHeader(latestBh, this.blockchainTarget));

        return true;
    }
}
