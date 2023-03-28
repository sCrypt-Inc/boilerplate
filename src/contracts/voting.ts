import {
    assert,
    ByteString,
    hash256,
    method,
    prop,
    SmartContract,
    FixedArray,
    fill,
    toByteString,
} from 'scrypt-ts'

export type CandidateName = ByteString

export type Candidate = {
    name: CandidateName
    votesReceived: bigint
}

export type Candidates = FixedArray<Candidate, 10>

export class Voting extends SmartContract {
    @prop(true)
    candidates: Candidates

    constructor(candidateNames: FixedArray<CandidateName, 10>) {
        super(...arguments)
        this.candidates = fill(
            {
                name: toByteString(''),
                votesReceived: 0n,
            },
            10
        )

        for (let i = 0; i < 10; i++) {
            this.candidates[i] = {
                name: candidateNames[i],
                votesReceived: 0n,
            }
        }
    }

    /**
     * vote for a candidate
     * @param candidate candidate's name
     */
    @method()
    public vote(candidate: CandidateName) {
        this.updateVotesReceived(candidate)
        // output containing the latest state and the same balance
        let outputs: ByteString = this.buildStateOutput(this.ctx.utxo.value)
        if (this.changeAmount > 0n) {
            outputs += this.buildChangeOutput()
        }
        assert(this.ctx.hashOutputs == hash256(outputs), 'hashOutputs mismatch')
    }

    @method()
    updateVotesReceived(candidate: CandidateName): void {
        for (let i = 0; i < 10; i++) {
            if (this.candidates[i].name == candidate) {
                this.candidates[i].votesReceived++
            }
        }
    }
}
