import {
    assert,
    ByteString,
    byteString2Int,
    hash256,
    int2ByteString,
    method,
    prop,
    PubKey,
    PubKeyHash,
    reverseByteString,
    Sha256,
    Sig,
    SigHash,
    SmartContract,
    toByteString,
    Utils,
} from 'scrypt-ts'
import { SECP256K1, Signature } from 'scrypt-ts-lib'

/*
 * A multi-sig contract where the order of the signings is enforced.
 */
export class OrderedSig extends SmartContract {
    @prop()
    msg: ByteString

    @prop()
    signer0: PubKey

    @prop()
    signer1: PubKey

    @prop()
    signer2: PubKey

    @prop()
    dest: PubKeyHash

    constructor(
        msg: ByteString,
        signer0: PubKey,
        signer1: PubKey,
        signer2: PubKey,
        dest: PubKeyHash
    ) {
        super(...arguments)
        this.msg = msg
        this.signer0 = signer0
        this.signer1 = signer1
        this.signer2 = signer2
        this.dest = dest
    }

    @method(SigHash.ANYONECANPAY_SINGLE)
    public unlock(sig0: Sig, sig1: Signature, sig2: Signature) {
        // First sig is checked by a regular OP_CHECKSIG.
        assert(this.checkSig(sig0, this.signer0), 'sig0 invalid')

        // The subsequent ones get checked by the SECP256K1 lib, as the message is not the tx itself,
        // but the first signature.
        // Signing the previous signature ensures that sig1 was created AFTER sig0.
        const hash1 = byteString2Int(
            reverseByteString(hash256(sig0), 32) + toByteString('00')
        )
        assert(
            SECP256K1.verifySig(
                hash1,
                sig1,
                SECP256K1.pubKey2Point(this.signer1)
            ),
            'sig1 invalid'
        )

        const hash2 = byteString2Int(
            reverseByteString(OrderedSig.hashSignature(sig1), 32) +
                toByteString('00')
        )
        assert(
            SECP256K1.verifySig(
                hash2,
                sig2,
                SECP256K1.pubKey2Point(this.signer2)
            ),
            'sig2 invalid'
        )

        // Ensure the next output pays the specified address.
        const destScript = Utils.buildPublicKeyHashScript(this.dest)
        const out = Utils.buildOutput(destScript, this.ctx.utxo.value)
        assert(hash256(out) == this.ctx.hashOutputs, 'hashOutputs mismatch')
    }

    // Hashes Signature object (non-DER)
    @method()
    static hashSignature(sig: Signature): Sha256 {
        return hash256(int2ByteString(sig.r, 33n) + int2ByteString(sig.s, 33n))
    }
}
