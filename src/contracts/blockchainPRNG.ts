import 'blockchain.ts'
import {assert, method, prop, SmartContract, PubKey, Sig, Sha256} from 'scrypt-ts'
export class BlockchainPRNG extends SmartContract{
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
public Bet(bh : BlockHeader, merkleproof : MerkleProof, sig : Sig){
    const prevTxid : ByteString = this.ctx.utxo.outpoint.txid
    assert(Blockhain.isBlockHeaderValid(bh, this.blockchainTarget))
    assert(Blockhain.txInBlock(prevTxid, bh, merkleproof))
    const winner : PubKey = bh.nonce % 2 ? this.alice : this.bob
    assert(checkSig(sig, winner))
}

}