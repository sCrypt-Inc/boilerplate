import {
    Addr,
    assert,
    method,
    prop,
    PubKey,
    pubKey2Addr,
    Sig,
    SmartContract,
} from 'scrypt-ts'

/*
 * A simple Pay to Public Key Hash (P2PKH) contract.
 */
export class P2PKH extends SmartContract {
    // Address of the recipient.
    @prop()
    readonly address: Addr

    constructor(address: Addr) {
        super(...arguments)
        this.address = address
    }

    @method()
    public unlock(sig: Sig, pubKey: PubKey) {
        // Check if the passed public key belongs to the specified address.
        assert(
            pubKey2Addr(pubKey) == this.address,
            'pubKey does not belong to address'
        )
        // Check signature validity.
        assert(this.checkSig(sig, pubKey), 'signature check failed')
    }
}
