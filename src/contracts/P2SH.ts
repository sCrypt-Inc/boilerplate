import {
    ByteString,
    Addr,
    SmartContract,
    Utils,
    assert,
    hash160,
    hash256,
    method,
    prop,
} from 'scrypt-ts'

export class P2SH extends SmartContract {
    @prop()
    scripthash: Addr

    constructor(scripthash: Addr) {
        super(...arguments)
        this.scripthash = scripthash
    }

    @method()
    public redeem(redeemScript: ByteString) {
        assert(hash160(redeemScript) == this.scripthash)

        const amount: bigint = this.ctx.utxo.value

        // use redeem script as the new locking script, whithou changing the utxo balance
        const output: ByteString = Utils.buildOutput(redeemScript, amount)

        assert(hash256(output) == this.ctx.hashOutputs)
    }
}
