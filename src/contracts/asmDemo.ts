import {
    assert,
    method,
    prop,
    PubKey,
    Addr,
    Sig,
    SmartContract,
    pubKey2Addr,
} from 'scrypt-ts'

export class P2PKH_ASM extends SmartContract {
    @prop()
    readonly address: Addr

    constructor(address: Addr) {
        super(...arguments)
        this.address = address
    }

    @method()
    public unlock(sig: Sig, pubkey: PubKey) {
        assert(
            pubKey2Addr(pubkey) == this.address,
            'public key does not belong to address'
        )
        assert(this.checkSig(sig, pubkey), 'signature check failed')
    }
}
