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

export class RockPaperScissors extends SmartContract {
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
            PlayerAMove == RockPaperScissors.ROCK &&
            PlayerBMove == RockPaperScissors.SCIRSSORS
        ) {
            Utils.buildPublicKeyHashOutput(hash160(this.PlayerA), amount)
            assert(this.checkSig(sig, this.PlayerA))
        } else if (
            PlayerAMove == RockPaperScissors.SCIRSSORS &&
            PlayerBMove == RockPaperScissors.PAPER
        ) {
            Utils.buildPublicKeyHashOutput(hash160(this.PlayerA), amount)
            assert(this.checkSig(sig, this.PlayerA))
        } else if (
            PlayerAMove == RockPaperScissors.PAPER &&
            PlayerBMove == RockPaperScissors.ROCK
        ) {
            Utils.buildPublicKeyHashOutput(hash160(this.PlayerA), amount)
            assert(this.checkSig(sig, this.PlayerA))
        } else if (
            PlayerBMove == RockPaperScissors.ROCK &&
            PlayerAMove == RockPaperScissors.SCIRSSORS
        ) {
            Utils.buildPublicKeyHashOutput(hash160(this.PlayerB), amount)
            assert(this.checkSig(sig, this.PlayerB))
        } else if (
            PlayerBMove == RockPaperScissors.SCIRSSORS &&
            PlayerAMove == RockPaperScissors.PAPER
        ) {
            Utils.buildPublicKeyHashOutput(hash160(this.PlayerB), amount)
            assert(this.checkSig(sig, this.PlayerB))
        } else if (
            PlayerBMove == RockPaperScissors.PAPER &&
            PlayerAMove == RockPaperScissors.ROCK
        ) {
            Utils.buildPublicKeyHashOutput(hash160(this.PlayerB), amount)
            assert(this.checkSig(sig, this.PlayerB))
        }
        assert(true)
    }
}
