import {
    assert,
    ByteString,
    hash256,
    method,
    prop,
    PubKeyHash,
    SigHash,
    SmartContract,
    Utils,
} from 'scrypt-ts'

/*
 * This contract demonstrates how we can enforce a payment to a
 * specific address after the contract gets called. Anyone can spend
 * the UTXO containing this contract, but the contract code makes sure
 * the next output will be a P2PKH paying the address in the "pubKeyHash"
 * property.
 */
export class AnyoneCanSpend extends SmartContract {
    // Address of the recipient.
    @prop()
    readonly pubKeyHash: PubKeyHash

    constructor(pubKeyHash: PubKeyHash) {
        super(...arguments)
        this.pubKeyHash = pubKeyHash
    }

    @method(SigHash.ANYONECANPAY_SINGLE)
    public unlock() {
        const output: ByteString = Utils.buildPublicKeyHashOutput(
            this.pubKeyHash,
            this.changeAmount
        )
        assert(
            hash256(output) == this.ctx.hashOutputs,
            'hashOutputs check failed'
        )
    }
}
