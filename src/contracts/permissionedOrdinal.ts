import {
    PubKey,
    Sig,
    SmartContract,
    Utils,
    assert,
    hash256,
    int2ByteString,
    method,
    prop,
    slice,
} from 'scrypt-ts'

// https://xiaohuiliu.medium.com/integrate-ordinals-with-smart-contracts-on-bitcoin-part-1-33e421314ac0
export class PermissionedOrdinal extends SmartContract {
    @prop()
    issuer: PubKey

    @prop(true)
    currentOwner: PubKey

    @prop(true)
    isMint: boolean

    @prop()
    inscriptLen: bigint

    constructor(issuer: PubKey, currentOwner: PubKey, inscriptLen: bigint) {
        super(...arguments)
        this.issuer = issuer
        this.currentOwner = currentOwner
        this.isMint = true
        this.inscriptLen = inscriptLen
    }

    @method()
    public transfer(sigCurrentOwner: Sig, sigIssuer: Sig, newOwner: PubKey) {
        // Check current owner signature.
        assert(this.checkSig(sigCurrentOwner, this.currentOwner))

        // Check issuer signature.
        assert(this.checkSig(sigIssuer, this.issuer))

        // Set new owners address
        this.currentOwner = newOwner

        // Save a local copy of isMint flag
        const isMint = this.isMint

        // Disable isMint flag after first transfer
        this.isMint = false

        // Ensure the public method is called from the first input.
        const outpoint =
            this.ctx.utxo.outpoint.txid +
            int2ByteString(this.ctx.utxo.outpoint.outputIndex, 4n)
        assert(
            slice(this.prevouts, 0n, 36n) == outpoint,
            'contract must be spent via first input'
        )

        let stateScript = this.getStateScript()
        if (isMint) {
            // Cut leading inscription script.
            stateScript = slice(stateScript, this.inscriptLen)
        }

        // Propagate contract to next output and ensure the value stays 1 sat.
        let outputs = Utils.buildOutput(stateScript, 1n)
        outputs += this.buildChangeOutput()
        assert(this.ctx.hashOutputs == hash256(outputs), 'hashOutputs mismatch')
    }
}
