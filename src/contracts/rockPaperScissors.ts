import {
    ByteString,
    PubKey,
    Sha256,
    Sig,
    SmartContract,
    Utils,
    assert,
    hash256,
    int2ByteString,
    method,
    prop,
    pubKey2Addr,
    toByteString,
} from 'scrypt-ts'

export class RockPaperScissors2 extends SmartContract {
    @prop()
    playerA: PubKey
    @prop()
    playerB: PubKey
    @prop()
    playerAHash: Sha256
    @prop()
    playerBHash: Sha256

    @prop()
    static readonly ROCK: bigint = 0n
    @prop()
    static readonly PAPER: bigint = 1n
    @prop()
    static readonly SCISSORS: bigint = 2n

    constructor(
        playerA: PubKey,
        playerB: PubKey,
        playerAHash: Sha256,
        playerBHash: Sha256
    ) {
        super(...arguments)
        this.playerA = playerA
        this.playerB = playerB
        this.playerAHash = playerAHash
        this.playerBHash = playerBHash
    }

    @method()
    public play(
        playerAMove: bigint,
        playerBMove: bigint,
        playerASalt: ByteString,
        playerBSalt: ByteString
    ) {
        // Check players move commitments.
        // Salt is used to prevent hash collisions.
        assert(
            hash256(int2ByteString(playerAMove, 1n) + playerASalt) ==
                this.playerAHash,
            'Invalid move'
        )
        assert(
            hash256(int2ByteString(playerBMove, 1n) + playerBSalt) ==
                this.playerBHash,
            'Invalid move'
        )

        // Get total amount locked in the smart contract.
        const amount = this.ctx.utxo.value

        let outputs = toByteString('')
        if (playerAMove == playerBMove) {
            // Draw.
            // Split amount 50/50.
            outputs += Utils.buildPublicKeyHashOutput(
                pubKey2Addr(this.playerA),
                amount / 2n
            )
            outputs += Utils.buildPublicKeyHashOutput(
                pubKey2Addr(this.playerB),
                amount / 2n
            )
        } else {
            // Winner takes all.
            let winner = this.playerB
            if (
                (playerAMove == RockPaperScissors2.ROCK &&
                    playerBMove == RockPaperScissors2.SCISSORS) ||
                (playerAMove == RockPaperScissors2.SCISSORS &&
                    playerBMove == RockPaperScissors2.PAPER) ||
                (playerAMove == RockPaperScissors2.PAPER &&
                    playerBMove == RockPaperScissors2.ROCK)
            ) {
                winner = this.playerA
            }

            outputs += Utils.buildPublicKeyHashOutput(
                pubKey2Addr(winner),
                amount
            )
        }

        // Add change output.
        outputs += this.buildChangeOutput()

        // Enforce built outputs.
        assert(hash256(outputs) == this.ctx.hashOutputs, 'hashOutputs mismatch')
    }
}
