import { FixedArray, PubKey, Sha256, Sig, SmartContract, assert, method, prop } from "scrypt-ts";
import { BlockHeader, Blockchain } from "./blockchain";
import { MerkleProof } from "./merklePath";

export class BlockTimeBet extends SmartContract{

    @prop()
    static readonly N : bigint = 7n

@prop()
static readonly AVG_BLOCK_TIME : bigint = 600n

@prop()
blockchainTarget : bigint
@prop()
alice : PubKey
@prop()
bob : PubKey

constructor(blockchainTarget : bigint, alice : PubKey, bob : PubKey){
    super(...arguments)
    this.blockchainTarget = blockchainTarget
    this.alice = alice
    this.bob = bob
}

@method()
public main(headers : BlockHeader, merkleproof : MerkleProof, sig : Sig ){
    // get id of previous tx
    let prevTxid : Sha256 = Sha256(this.ctx.utxo.outpoint.txid)

    // validate blockchain header
    assert(Blockchain.isValidBlockHeader(headers, this.blockchainTarget))

    // verify previous tx
    assert(Blockchain.txInBlock(prevTxid,headers[1], merkleproof))

    // block time is the time difference between this block and last
    let blockTime  = headers[1].time - headers[0].time

    // alice wins if block is mined within 10 mins, otherwise bob wins

    let winner : PubKey = blockTime < BlockTimeBet.AVG_BLOCK_TIME ? this.alice : this.bob

    assert(this.checkSig(sig, winner))
}

}