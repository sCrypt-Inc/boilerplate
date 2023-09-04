import {
    ByteString,
    PubKey,
    Sig,
    SmartContract,
    Utils,
    assert,
    hash160,
    hash256,
    int2ByteString,
    method,
    prop,
    slice,
} from 'scrypt-ts'

export class OrdinalSwap extends SmartContract {
    @prop()
    readonly alice: PubKey

    @prop()
    readonly bob: PubKey

    @prop()
    readonly prevoutBob: ByteString

    constructor(alice: PubKey, bob: PubKey, prevoutBob: ByteString) {
        super(...arguments)
        this.alice = alice
        this.bob = bob
        this.prevoutBob = prevoutBob
    }

    @method()
    public swap() {
        // Ensure the public method is called from the first input.
        const outpoint =
            this.ctx.utxo.outpoint.txid +
            int2ByteString(this.ctx.utxo.outpoint.outputIndex, 4n)
        assert(
            slice(this.prevouts, 0n, 36n) == outpoint,
            'contract must be spent via first input'
        )

        // Ensure the second input spends Bobs ordinal output.
        assert(
            slice(this.prevouts, 36n, 72n) == this.prevoutBob,
            'second input must spend Bobs ordinal output'
        )

        // Transfer Alice's ordinal which is locked in this contract to Bob.
        let outputs = Utils.buildPublicKeyHashOutput(hash160(this.bob), 1n)

        // Transfer Bob's ordinal, unlocked by the second input to Alice.
        outputs += Utils.buildPublicKeyHashOutput(hash160(this.alice), 1n)

        // Add change output.
        outputs += this.buildChangeOutput()

        assert(hash256(outputs) == this.ctx.hashOutputs, 'hashOutputs mismatch')
    }

    @method()
    public cancel(aliceSig: Sig) {
        assert(this.checkSig(aliceSig, this.alice))
    }
}
