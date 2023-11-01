import { OrdinalNFT } from 'scrypt-ord'
import {
    PubKey,
    Sig,
    assert,
    hash256,
    int2ByteString,
    method,
    prop,
    slice,
} from 'scrypt-ts'

// https://xiaohuiliu.medium.com/integrate-ordinals-with-smart-contracts-on-bitcoin-part-1-33e421314ac0
export class PermissionedOrdinal extends OrdinalNFT {
    @prop()
    issuer: PubKey

    @prop(true)
    currentOwner: PubKey

    constructor(issuer: PubKey, currentOwner: PubKey) {
        super()
        this.init(...arguments)
        this.issuer = issuer
        this.currentOwner = currentOwner
    }

    @method()
    public transfer(sigCurrentOwner: Sig, sigIssuer: Sig, newOwner: PubKey) {
        // Check current owner signature.
        assert(this.checkSig(sigCurrentOwner, this.currentOwner))

        // Check issuer signature.
        assert(this.checkSig(sigIssuer, this.issuer))

        // Set new owners address
        this.currentOwner = newOwner

        // Ensure the public method is called from the first input.
        const outpoint =
            this.ctx.utxo.outpoint.txid +
            int2ByteString(this.ctx.utxo.outpoint.outputIndex, 4n)
        assert(
            slice(this.prevouts, 0n, 36n) == outpoint,
            'contract must be spent via first input'
        )

        // Propagate contract to next output and ensure the value stays 1 sat.
        let outputs = this.buildStateOutputNFT()
        outputs += this.buildChangeOutput()
        assert(this.ctx.hashOutputs == hash256(outputs), 'hashOutputs mismatch')
    }
}
