import { BlockHeader, MerkleProof, Blockchain } from 'scrypt-ts-lib'
import {
    PubKey,
    assert,
    Sig,
    SmartContract,
    method,
    prop,
    Sha256,
} from 'scrypt-ts'

/* A trustless pseudo-random number generator
    using the block containing the deployed contract tx as an entropy source
    */
export class BlockchainPRNG extends SmartContract {
    // maximal target for any block to be considered valid

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

    /* @bh : header of the block cpontaining the contract UTXO
       @merkleproof : MerkleProof for the tx
       @sig : winner signature
    */

    @method()
    public bet(bh: BlockHeader, merkleproof: MerkleProof, sig: Sig) {
        const prevTxid: Sha256 = Sha256(this.ctx.utxo.outpoint.txid)

        // validate block header
        assert(Blockchain.isValidBlockHeader(bh, this.blockchainTarget))

        // verify previous transaction in the block
        assert(Blockchain.txInBlock(prevTxid, bh, merkleproof))

        // use block header's nonce last bit as apseudo-random number
        const winner: PubKey = bh.nonce % 2n ? this.alice : this.bob

        assert(this.checkSig(sig, winner))
    }
}
