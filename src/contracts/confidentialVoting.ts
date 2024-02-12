import {
    ByteString,
    FixedArray,
    HashedMap,
    PubKey,
    Sha256,
    Sig,
    SmartContract,
    assert,
    fill,
    hash256,
    method,
    prop,
    toByteString,
} from 'scrypt-ts'

export type Candidate = {
    name: ByteString
    votesReceived: bigint
}

export class ConfidentialVoting extends SmartContract {
    @prop()
    voters: FixedArray<PubKey, 3>

    @prop(true)
    voteCommits: HashedMap<PubKey, Sha256>

    @prop(true)
    voteRevealed: boolean

    @prop(true)
    candidates: FixedArray<Candidate, 2>

    @prop()
    VoteDeadline: bigint

    @prop()
    revealDeadline: bigint

    @prop(true)
    voteFinished: boolean

    constructor(
        voters: FixedArray<PubKey, 3>,
        candidates: FixedArray<Candidate, 2>,
        voteCommits: HashedMap<PubKey, Sha256>,
        voteDeadline: bigint,
        revealDeadline: bigint
    ) {
        super(...arguments)
        this.voters = voters
        this.voteRevealed = false
        this.voteCommits = voteCommits
        this.VoteDeadline = voteDeadline
        this.revealDeadline = revealDeadline
        this.voteFinished = false
        this.candidates = fill(
            {
                name: toByteString(''),
                votesReceived: 0n,
            },
            2
        )
    }

    @method()
    public vote(voter: PubKey, voteCommitment: Sha256, sig: Sig) {
        // Check if voting is still allowed
        assert(!this.voteRevealed, 'Voting is already closed')

        // Verify if the voter is elliglble
        assert(!this.voteCommits.has(voter))

        // Store the commit associated with the voter
        this.voteCommits.set(voter, voteCommitment)

        //propagate the state
        let output =
            this.buildStateOutput(this.ctx.utxo.value) +
            this.buildChangeOutput()

        assert(hash256(output) == this.ctx.hashOutputs, 'hashOutputs mismatch')

        // Check voter signature
        assert(this.checkSig(sig, voter))
    }

    @method()
    public reveal(
        voter: PubKey,
        voteCommitment: Sha256,
        salt: ByteString,
        candidateIdx: bigint
    ) {
        assert(!this.voteRevealed, 'Voting has already been revealed')

        // Marked voting as revealed
        this.voteRevealed = true
        //check if the pubkey contained the passed commitment
        assert(this.voteCommits.canGet(voter, voteCommitment))
        // Verify the commitment and update vote count
        const commit = hash256(voteCommitment + salt)

        assert(voteCommitment === commit, 'Invalid commit')

        // Update vote count
        const candidateIndex = this.candidates[Number(candidateIdx)] // Assuming candidates are numbered starting from 1
        assert(
            candidateIdx >= 0 && candidateIdx < this.candidates.length,
            'Invalid candidate index'
        )
        this.candidates[Number(candidateIdx)].votesReceived++

        // Check if voting deadline has passed
        assert(
            this.timeLock(this.VoteDeadline),
            'Voting deadline has not passed'
        )
    }

    @method()
    public finish(candidateIdx : bigint) {
        // candidate with the most votes wins
       
            if (
                Number(this.candidates[Number(0)].votesReceived) >
                Number(this.candidates[Number(candidateIdx)].votesReceived)
            ) 
              
        // log the winner
        console.log('Winner:', this.candidates[Number(0)].name)

         // Ensure voting has been revealed
         assert(this.voteRevealed, 'Voting has not been revealed yet')
    }
}
