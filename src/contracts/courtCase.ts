import { assert } from 'console'
import {
    Addr,
    FixedArray,
    hash256,
    method,
    prop,
    PubKey,
    Sig,
    SmartContract,
    Utils,
} from 'scrypt-ts'

export class CourtCase extends SmartContract {
    static readonly JURY_THRESHOLD = 6

    @prop()
    jury: FixedArray<PubKey, 12>

    @prop(true)
    judge: PubKey

    @prop()
    defendant: Addr

    @prop()
    dismissalDeadline: bigint

    constructor(
        jury: FixedArray<PubKey, 12>,
        judge: PubKey,
        defendant: Addr,
        stateTreasury: Addr,
        dismissalDeadline: bigint
    ) {
        super(...arguments)
        this.jury = jury
        this.judge = judge
        this.defendant = defendant
        this.dismissalDeadline = dismissalDeadline
    }

    @method()
    public resolve(
        sigsJury: FixedArray<Sig, typeof CourtCase.JURY_THRESHOLD>,
        sigJudge: Sig
    ) {
        // Check jury signatures.
        assert(this.checkMultiSig(sigsJury, this.jury), 'jury invalid multisig')

        // Check judge signature.
        assert(this.checkSig(sigJudge, this.judge), 'judge invalid sig')

        // Release funds to defendant.
        let outputs = Utils.buildAddressOutput(
            this.defendant,
            this.ctx.utxo.value
        )
        outputs += this.buildChangeOutput()
        assert(hash256(outputs) == this.ctx.hashOutputs, 'hashOutputs mismatch')
    }

    @method()
    public dismiss(sigJudge: Sig) {
        // Check judge signature.
        assert(this.checkSig(sigJudge, this.judge), 'judge invalid sig')

        // Check deadline.
        assert(
            this.timeLock(this.dismissalDeadline),
            'dismissal deadline not reached'
        )

        // Release funds to defendant.
        let outputs = Utils.buildAddressOutput(
            this.defendant,
            this.ctx.utxo.value
        )
        outputs += this.buildChangeOutput()
        assert(hash256(outputs) == this.ctx.hashOutputs, 'hashOutputs mismatch')
    }

    @method()
    public appeal(sigJudge: Sig, appellateJudge: PubKey) {
        // Check judge signature.
        assert(this.checkSig(sigJudge, this.judge), 'judge invalid sig')

        // Set appellate judge as the new judge.
        this.judge = appellateJudge

        // Propagate contract.
        let outputs = this.buildStateOutput(this.ctx.utxo.value)
        outputs += this.buildChangeOutput()
        assert(hash256(outputs) == this.ctx.hashOutputs, 'hashOutputs mismatch')
    }
}
