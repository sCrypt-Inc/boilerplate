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
export const N = 10

export type Candidates = FixedArray<Candidate, typeof N>

export class Voting extends SmartContract {
    @prop(true)
    candidates: Candidates

    constructor(candidateNames: FixedArray<CandidateName, typeof N>) {
        super(...arguments)
        this.candidates = fill(
            {
                name: toByteString(''),
                votesReceived: 0n,
            },
            N
        )

        for (let i = 0; i < N; i++) {
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
        this.increaseVotesReceived(candidate)
        // output containing the latest state and the same balance
        let outputs: ByteString = this.buildStateOutput(this.ctx.utxo.value)
        outputs += this.buildChangeOutput()
        assert(this.ctx.hashOutputs == hash256(outputs), 'hashOutputs mismatch')
    }

    @method()
    increaseVotesReceived(candidate: CandidateName): void {
        for (let i = 0; i < N; i++) {
            if (this.candidates[i].name == candidate) {
                this.candidates[i].votesReceived++
            }
        }
    }
}
