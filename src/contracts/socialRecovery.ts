import {
    assert,
    hash256,
    method,
    prop,
    PubKey,
    ByteString,
    Sig,
    SmartContract,
    FixedArray,
    SigHash,
} from 'scrypt-ts'

export class SocialRecovery extends SmartContract {
    static readonly N_GUARDIANS = 5
    static readonly GUARDIAN_THRESHOLD = 3

    @prop(true)
    signingPubKey: PubKey

    @prop(true)
    guardianPubKeys: FixedArray<PubKey, typeof SocialRecovery.N_GUARDIANS>

    constructor(
        signingPubKey: PubKey,
        guardianPubKeys: FixedArray<PubKey, typeof SocialRecovery.N_GUARDIANS>
    ) {
        super(...arguments)
        this.signingPubKey = signingPubKey
        this.guardianPubKeys = guardianPubKeys
    }

    @method()
    public unlock(sig: Sig) {
        assert(
            this.checkSig(sig, this.signingPubKey),
            'Signature check failed.'
        )
    }

    // ANYONECANPAY_SINGLE is used here to ignore all inputs and outputs, other than the ones contains the state
    // see https://scrypt.io/scrypt-ts/getting-started/what-is-scriptcontext#sighash-type
    @method(SigHash.ANYONECANPAY_SINGLE)
    public updateSigningPubKey(
        newSigningPubKey: PubKey,
        guardianSigs: FixedArray<Sig, typeof SocialRecovery.N_GUARDIANS>
    ) {
        // Check guarding signatures and count correct ones.
        let nCorrect = 0n
        for (let i = 0; i < SocialRecovery.N_GUARDIANS; i++) {
            if (this.checkSig(guardianSigs[i], this.guardianPubKeys[i])) {
                nCorrect += 1n
            }
        }

        // Assert that the defined guardian threshold was reached.
        assert(
            nCorrect >= BigInt(SocialRecovery.GUARDIAN_THRESHOLD),
            'Guardian threshold not reached.'
        )

        // Update signing pubkey.
        this.signingPubKey = newSigningPubKey

        // Make sure balance in the contract does not change.
        const amount: bigint = this.ctx.utxo.value
        // Output containing the latest state.
        const output: ByteString = this.buildStateOutput(amount)
        // Verify current tx has this single output.
        assert(this.ctx.hashOutputs == hash256(output), 'hashOutputs mismatch')
    }
}
