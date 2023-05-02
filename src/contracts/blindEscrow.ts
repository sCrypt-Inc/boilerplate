import {
    assert,
    ByteString,
    exit,
    hash160,
    int2ByteString,
    method,
    prop,
    PubKey,
    PubKeyHash,
    Sig,
    SmartContract,
    toByteString,
} from 'scrypt-ts'
import { SECP256K1 as EC } from 'scrypt-ts-lib'

export class BlindEscrow extends SmartContract {
    // 4 possible actions:
    // - buyer signs and uses sellers stamp (releaseBySeller)
    // - buyer signs and uses arbiters stamp (releaseByArbiter)
    // - seller signs and uses buyers stamp (returnByBuyer)
    // - seller signs and uses arbiters stamp (returnByArbiter)
    static readonly RELEASE_BY_SELLER = 0n
    static readonly RELEASE_BY_ARBITER = 1n
    static readonly RETURN_BY_BUYER = 2n
    static readonly RETURN_BY_ARBITER = 3n

    @prop()
    seller: PubKeyHash

    @prop()
    buyer: PubKeyHash

    @prop()
    arbiter: PubKeyHash

    @prop()
    escrowNonce: ByteString

    constructor(
        seller: PubKeyHash,
        buyer: PubKeyHash,
        arbiter: PubKeyHash,
        escrowNonce: ByteString
    ) {
        super(...arguments)
        this.seller = seller
        this.buyer = buyer
        this.arbiter = arbiter
        this.escrowNonce = escrowNonce
    }

    @method()
    public spend(
        spenderSig: Sig,
        spenderPubKey: PubKey,
        oracleSig: Sig,
        oraclePubKey: PubKey,
        action: bigint
    ) {
        let spender = PubKeyHash(
            toByteString('0000000000000000000000000000000000000000')
        )
        let oracle = PubKeyHash(
            toByteString('0000000000000000000000000000000000000000')
        )

        // Load correct addresses.
        if (action == BlindEscrow.RELEASE_BY_SELLER) {
            spender = this.buyer
            oracle = this.seller
        } else if (action == BlindEscrow.RELEASE_BY_ARBITER) {
            spender = this.buyer
            oracle = this.arbiter
        } else if (action == BlindEscrow.RETURN_BY_BUYER) {
            spender = this.seller
            oracle = this.buyer
        } else if (action == BlindEscrow.RETURN_BY_ARBITER) {
            spender = this.seller
            oracle = this.arbiter
        } else {
            // Invalid action
            exit(false)
        }

        // Check public keys belong to the specified addresses
        assert(hash160(spenderPubKey) == spender, 'Wrong spender pub key')
        assert(hash160(oraclePubKey) == oracle, 'Wrong oracle pub key')

        // Check oracle signature.
        const oracleMsg: ByteString = this.escrowNonce + int2ByteString(action)
        //assert(EC.verifySig(oracleMsg, oracleSig, oraclePubKey), 'Oracle sig invalid')

        // Check spender signature.
        assert(this.checkSig(spenderSig, spenderPubKey), 'Spender sig invalid')
    }
}
