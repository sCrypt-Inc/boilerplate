import {
    ByteString,
    PubKey,
    Sig,
    SmartContract,
    Utils,
    assert,
    hash256,
    int2ByteString,
    method,
    prop,
    pubKey2Addr,
    slice,
} from 'scrypt-ts'

/*
 * This contract enables an atomic swap of an ordinal for satoshis.
 */
export class OrdinalSwap extends SmartContract {
    @prop()
    readonly alice: PubKey

    @prop()
    readonly bob: PubKey

    // Reference to UTXO, which holds Bob's satoshis (or ordinal) (TXID + output idx).
    @prop()
    readonly prevoutBob: ByteString

    // Amount in Bob's UTXO. Needs to be checked by Bob before signing his input.
    @prop()
    readonly prevoutBobAmount: bigint

    constructor(
        alice: PubKey,
        bob: PubKey,
        prevoutBob: ByteString,
        prevoutBobAmount: bigint
    ) {
        super(...arguments)
        this.alice = alice
        this.bob = bob
        this.prevoutBob = prevoutBob
        this.prevoutBobAmount = prevoutBobAmount
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

        // Ensure the second input spends Bobs output.
        assert(
            slice(this.prevouts, 36n, 72n) == this.prevoutBob,
            'second input must spend Bobs output'
        )

        // Transfer Alice's ordinal which is locked in this contract to Bob.
        let outputs = Utils.buildPublicKeyHashOutput(pubKey2Addr(this.bob), 1n)

        // Transfer Bob's funds (or ordinal), unlocked by the second input to Alice.
        outputs += Utils.buildPublicKeyHashOutput(
            pubKey2Addr(this.alice),
            this.prevoutBobAmount
        )

        // Add change output.
        outputs += this.buildChangeOutput()

        assert(hash256(outputs) == this.ctx.hashOutputs, 'hashOutputs mismatch')
    }

    @method()
    public cancel(aliceSig: Sig) {
        assert(this.checkSig(aliceSig, this.alice))
    }
}
