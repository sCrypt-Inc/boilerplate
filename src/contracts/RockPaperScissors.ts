import {
    PubKey,
    Sig,
    SmartContract,
    Utils,
    assert,
    hash160,
    method,
    prop,
} from 'scrypt-ts'

export class RockPaperScissors2 extends SmartContract {
    @prop()
    PlayerA: PubKey
    @prop()
    PlayerB: PubKey
    @prop()
    static readonly ROCK: bigint = 1n
    @prop()
    static readonly PAPER: bigint = 2n
    @prop()
    static readonly SCIRSSORS: bigint = 3n

    constructor(PlayerA: PubKey, PlayerB: PubKey) {
        super(...arguments)
        this.PlayerA = PlayerA
        this.PlayerB = PlayerB
    }

    @method()
    public play(
        PlayerABet: bigint,
        PlayerBBet: bigint,
        PlayerAMove: bigint,
        PlayerBMove: bigint,
        sig : Sig
    ) {
        // bet amount should be greater than zero
        assert(PlayerABet > 0n, 'Bet Amount should be greater than 0')

        // Make sure playerA and PlayerB are betting the same amount
        assert(PlayerABet == PlayerBBet, 'Player should bet the same amount')

        // total amount
        const amount = this.ctx.utxo.value
        // draw
        if (PlayerAMove == PlayerBMove) {
            Utils.buildPublicKeyHashOutput(hash160(this.PlayerA), amount / 2n)
            Utils.buildPublicKeyHashOutput(hash160(this.PlayerB), amount / 2n)
            // possibilities of playerA and PlayerB winning
        } else if (
            PlayerAMove == RockPaperScissors2.ROCK &&
            PlayerBMove == RockPaperScissors2.SCIRSSORS
        ) {
            Utils.buildPublicKeyHashOutput(hash160(this.PlayerA), amount)
            assert(this.checkSig(sig, this.PlayerA))
        } else if (
            PlayerAMove == RockPaperScissors2.SCIRSSORS &&
            PlayerBMove == RockPaperScissors2.PAPER
        ) {
            Utils.buildPublicKeyHashOutput(hash160(this.PlayerA), amount)
            assert(this.checkSig(sig, this.PlayerA))
        } else if (
            PlayerAMove == RockPaperScissors2.PAPER &&
            PlayerBMove == RockPaperScissors2.ROCK
        ) {
            Utils.buildPublicKeyHashOutput(hash160(this.PlayerA), amount)
            assert(this.checkSig(sig, this.PlayerA))
        } else if (
            PlayerBMove == RockPaperScissors2.ROCK &&
            PlayerAMove == RockPaperScissors2.SCIRSSORS
        ) {
            Utils.buildPublicKeyHashOutput(hash160(this.PlayerB), amount)
            assert(this.checkSig(sig, this.PlayerB))
        } else if (
            PlayerBMove == RockPaperScissors2.SCIRSSORS &&
            PlayerAMove == RockPaperScissors2.PAPER
        ) {
            Utils.buildPublicKeyHashOutput(hash160(this.PlayerB), amount)
            assert(this.checkSig(sig, this.PlayerB))
        } else if (
            PlayerBMove == RockPaperScissors2.PAPER &&
            PlayerAMove == RockPaperScissors2.ROCK
        ) {
            Utils.buildPublicKeyHashOutput(hash160(this.PlayerB), amount)
            assert(this.checkSig(sig, this.PlayerB))
        }
        assert(true)
    }
}
