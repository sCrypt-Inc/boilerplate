import {
    assert,
    ByteString,
    hash256,
    method,
    prop,
    Addr,
    SigHash,
    SmartContract,
    Utils,
} from 'scrypt-ts'

/*
 * This contract demonstrates how we can enforce a payment to a
 * specific address after the contract gets called. Anyone can spend
 * the UTXO containing this contract, but the contract code makes sure
 * the next output will be a P2PKH paying the specified address.
 * property.
 */
export class EnforceRecipient extends SmartContract {
    // Address of the recipient.
    @prop()
    readonly address: Addr

    constructor(address: Addr) {
        super(...arguments)
        this.address = address
    }

    @method(SigHash.ANYONECANPAY_SINGLE)
    public unlock() {
        const output: ByteString = Utils.buildPublicKeyHashOutput(
            this.address,
            this.changeAmount
        )
        assert(
            hash256(output) == this.ctx.hashOutputs,
            'hashOutputs check failed'
        )
    }
}
