import {
    assert,
    ByteString,
    byteString2Int,
    exit,
    hash256,
    int2ByteString,
    method,
    prop,
    PubKey,
    Addr,
    reverseByteString,
    Sig,
    SmartContract,
    toByteString,
    pubKey2Addr,
} from 'scrypt-ts'
import { SECP256K1, Signature } from 'scrypt-ts-lib'

// Important to keep in mind:
// All public keys must be in uncompressed form. This also affects
// the values of the pub key hashes i.e. addresses.

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
    seller: Addr

    @prop()
    buyer: Addr

    @prop()
    arbiter: Addr

    @prop()
    escrowNonce: ByteString

    constructor(
        seller: Addr,
        buyer: Addr,
        arbiter: Addr,
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
        oracleSig: Signature,
        oraclePubKey: PubKey,
        action: bigint
    ) {
        let spender = Addr(
            toByteString('0000000000000000000000000000000000000000')
        )
        let oracle = Addr(
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
        assert(pubKey2Addr(spenderPubKey) == spender, 'Wrong spender pub key')
        assert(pubKey2Addr(oraclePubKey) == oracle, 'Wrong oracle pub key')

        // Check oracle signature, i.e. "stamp".
        const oracleMsg: ByteString = this.escrowNonce + int2ByteString(action)
        const hashInt = byteString2Int(
            reverseByteString(hash256(oracleMsg), 32n) + toByteString('00')
        )
        assert(
            SECP256K1.verifySig(
                hashInt,
                oracleSig,
                SECP256K1.pubKey2Point(oraclePubKey)
            ),
            'Oracle sig invalid'
        )

        // Check spender signature.
        assert(this.checkSig(spenderSig, spenderPubKey), 'Spender sig invalid')
    }
}
