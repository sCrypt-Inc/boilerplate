import {
    assert,
    ByteString,
    byteString2Int,
    hash160,
    hash256,
    method,
    prop,
    PubKey,
    PubKeyHash,
    reverseByteString,
    Sig,
    SmartContract,
    toByteString,
} from 'scrypt-ts'
import { SECP256K1, Signature } from 'scrypt-ts-lib'

/*
 * This is an implementation of the idea described here:
 * https://gist.github.com/awemany/619a5722d129dec25abf5de211d971bd
 * It is an attempt for safeguarding 0-conf transactions. Although due
 * to the nature of how Bitcoin works and the first-seen rule it is
 * redundant to use in the real-world.
 * This contract is meant more for demonstration purposes.
 *
 * Important to keep in mind:
 * All public keys must be in uncompressed form. This also affects
 * the values of the pub key hashes i.e. addresses.
 */
export class ZeroConfForfeit extends SmartContract {
    // PKH this tx is spending from.
    @prop()
    inputPKH: PubKeyHash

    // Recipient address.
    @prop()
    destPKH: PubKeyHash

    constructor(inputPKH: PubKeyHash, destPKH: PubKeyHash) {
        super(...arguments)
        this.inputPKH = inputPKH
        this.destPKH = destPKH
    }

    @method()
    public regularSpend(sig: Sig, pubKey: PubKey) {
        // Check if the passed public key belongs to the specified address.
        assert(
            hash160(pubKey) == this.destPKH,
            'public key hashes are not equal'
        )
        // Check signature validity.
        assert(this.checkSig(sig, pubKey), 'signature check failed')
    }

    // This method can be used by a miner who catched a customer attempt a double spend.
    @method()
    public forfeit(
        paymentPreimage: ByteString, // TX hash preimage of the initial payment of the customer to the merchant.
        doubleSpendPreimage: ByteString, // TX hash preimage of the attempted double spend by the customer.
        paymentSig: Signature,
        doubleSpendSig: Signature,
        pubKey: PubKey
    ) {
        // The provided PK needs to match the PK from the payment input.
        assert(hash160(pubKey) == this.inputPKH, 'PubKey not input PKH.')

        // Check signature of the original payment.
        const msg1HashInt = byteString2Int(
            reverseByteString(hash256(paymentPreimage), 32) + toByteString('00')
        )
        assert(
            SECP256K1.verifySig(
                msg1HashInt,
                paymentSig,
                SECP256K1.pubKey2Point(pubKey)
            ),
            'Payment sig invalid.'
        )

        // Check signature of the double spend attempt.
        const msg2HashInt = byteString2Int(
            reverseByteString(hash256(doubleSpendPreimage), 32) +
                toByteString('00')
        )
        assert(
            SECP256K1.verifySig(
                msg2HashInt,
                doubleSpendSig,
                SECP256K1.pubKey2Point(pubKey)
            ),
            'Double spend sig invalid.'
        )
    }
}
