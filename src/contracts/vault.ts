import { ByteString, PubKey, Sha256, Sig, SmartContract, assert, method, prop } from "scrypt-ts";
import { BlockHeader, Blockchain } from "./blockchain";
import { MerkleProof } from "./merklePath";

export class Vault extends SmartContract{
    @prop()
    unvaultingPeriod : bigint // time to wait before the money in the vault can be spent
    @prop()
    vaultKey : PubKey  //vault key typically stored in a hot wallet
    @prop()
    recoveryKey : PubKey  // recoveryKey typically stored in a cold wallet
    @prop()
    blockchainTarget : bigint  // maximal target for any block to be considered valid

    @prop(true)
    unvaulted : boolean

    constructor(unvaultingPeriod : bigint,
                vaultKey : PubKey,
                recoveryKey : PubKey,
                blockchainTarget : bigint,
                unvaulted : boolean){
                    super(...arguments)
                    this.unvaultingPeriod = unvaultingPeriod
                    this.vaultKey = vaultKey
                    this.recoveryKey = recoveryKey
                    this.blockchainTarget = blockchainTarget
                    this.unvaulted = false
                }

        @method()
        public unvault(sig : Sig){
            
            assert(!this.unvaulted)
            this.unvaulted = true
            let output : ByteString = this.buildStateOutput(this.ctx.utxo.value)
            assert(this.checkSig(sig, this.vaultKey))
        }

        @method()
        public withdraw(sig : Sig, utxoBh : BlockHeader, latestBh : BlockHeader, merkleproof : MerkleProof){
            assert(this.unvaulted)
            assert(this.checkSig(sig, this.vaultKey))
            this.validateHelper(utxoBh, latestBh, merkleproof)
            assert(latestBh.time - utxoBh.time >= this.unvaultingPeriod)
        }

        @method()
        public cancel(sig : Sig){
            assert(this.checkSig(sig, this.recoveryKey))
        }

// copied from contract CheckSequenceVerify
    // common validation for both relative timelock: Unix timestamp and block height
    // @utxoBh: block header containing the UTXO containing the contract
    // @latestBh: latest block header
        @method()
        validateHelper(utxoBh : BlockHeader, latestBh : BlockHeader, merkleproof : MerkleProof) : boolean {
            let prevTxid : Sha256 = Sha256(this.ctx.utxo.outpoint.txid)
            assert(Blockchain.txInBlock(prevTxid, utxoBh,merkleproof))
            assert(Blockchain.isValidBlockHeader(utxoBh, this.blockchainTarget))
            assert(Blockchain.isValidBlockHeader(latestBh, this.blockchainTarget))

            return true
        }

}
