import {
    PubKey,
    PubKeyHash,
    Sig,
    SmartContract,
    UTXO,
    Utils,
    assert,
    bsv,
    hash160,
    hash256,
    method,
    prop,
    slice,
} from 'scrypt-ts'

export class PermissionedOrdinal extends SmartContract {
    @prop()
    issuer: PubKey

    @prop(true)
    currentOwner: PubKeyHash

    @prop(true)
    isMint: boolean

    @prop()
    inscriptLen: bigint

    constructor(issuer: PubKey, currentOwner: PubKeyHash, inscriptLen: bigint) {
        super(...arguments)
        this.issuer = issuer
        this.currentOwner = currentOwner
        this.isMint = true
        this.inscriptLen = inscriptLen
    }

    @method()
    public transfer(
        sigCurrentOwner: Sig,
        pubKeyCurrentOwner: PubKey,
        sigIssuer: Sig,
        newOwner: PubKeyHash
    ) {
        // Check current owner signature.
        assert(
            hash160(pubKeyCurrentOwner) == this.currentOwner,
            "pubKeyCurrentOwner doesn't correspond to address"
        )
        assert(this.checkSig(sigCurrentOwner, pubKeyCurrentOwner))

        // Check issuer signature.
        assert(this.checkSig(sigIssuer, this.issuer))

        // Set new owners address
        this.currentOwner = newOwner

        // Save a local copy of isMint flag
        const isMint = this.isMint

        // Disable isMint flag after first transfer
        this.isMint = false

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
