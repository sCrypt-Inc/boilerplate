import {assert, prop, method, SmartContract,Sha256, PubKey, Sig, FixedArray, checkSig} from 'scrypt-ts'
import { Blockchain, BlockHeader, MerkleProof } from 'scrypt-ts-lib'
import 'blockchain.ts'

export class BlockTimeBet extends SmartContract {
  @prop()
  static readonly N = 7n

  // 10 minutes in seconds
  @prop()
  static readonly AVG_BLOCK_TIME = 600n

  // Maximum target for any block
  @prop()
  blockchainTarget: bigint

  @prop()
  alice: PubKey
  @prop()
  bob: PubKey

  constructor(blockchainTarget: bigint, alice: PubKey, bob: PubKey) {
    super(...arguments)
    this.blockchainTarget = blockchainTarget
    this.alice = alice
    this.bob = bob
  }

  @method()
  public main(headers: FixedArray<BlockHeader, N>, merkleProof: MerkleProof, sig: Sig) {
    // Get the ID of previous transaction.
    let prevTxid = Sha256(this.ctx.utxo.outpoint.txid)

    // Validate a block headers.
    assert(Blockchain.isBlockHeaderChainValid(this.N, headers, this.blockchainTarget))

    assert(Blockchain.txInBlock(prevTxid, headers[1], merkleProof))

    // Block time is the time difference between this block and last block.
    let blockTime = headers[1].time - headers[0].time

    // Alice wins if block is mined within 10 mins, otherwise Bob wins.
    let winner = blockTime < this.AVG_BLOCK_TIME ? this.alice : this.bob
    assert(checkSig(sig, winner))
  }
}
