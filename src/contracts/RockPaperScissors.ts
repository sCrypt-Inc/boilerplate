import {
    ByteString,
    PubKey,
    Sha256,
    Sig,
    SmartContract,
    Utils,
    assert,
    hash256,
    method,
    prop,
    pubKey2Addr,
    toByteString,
} from 'scrypt-ts'

export class RockPaperScissors2 extends SmartContract {
    @prop()
    PlayerA: PubKey
    @prop()
    PlayerB: PubKey
    @prop()
    PlayerAHash: Sha256
    @prop()
    PlayerBHash: Sha256
    @prop()
    static readonly ROCK: ByteString = toByteString('ROCK', true)
    @prop()
    static readonly PAPER: ByteString = toByteString('PAPER', true)
    @prop()
    static readonly SCISSORS: ByteString = toByteString('SCISSORS', true)

    constructor(
        PlayerA: PubKey,
        PlayerB: PubKey,
        PlayerAHash: Sha256,
        PlayerBHash: Sha256
    ) {
        super(...arguments)
        this.PlayerA = PlayerA
        this.PlayerB = PlayerB
        this.PlayerAHash = PlayerAHash
        this.PlayerBHash = PlayerBHash
    }

    @method()
    public play(
        PlayerABet: bigint,
        PlayerBBet: bigint,
        PlayerAMove: ByteString,
        PlayerBMove: ByteString,
        sig: Sig
    ) {
        // bet amount should be greater than zero
        assert(PlayerABet > 0n, 'Bet Amount should be greater than 0')

        // Make sure playerA and PlayerB are betting the same amount
        assert(PlayerABet == PlayerBBet, 'Player should bet the same amount')

        assert(hash256(PlayerAMove) == this.PlayerAHash, 'Invalid move')

        assert(hash256(PlayerBMove) == this.PlayerBHash, 'Invalid move')

        // total amount
        const amount = this.ctx.utxo.value
        // draw
        if (PlayerAMove == PlayerBMove) {
            Utils.buildPublicKeyHashOutput(
                pubKey2Addr(this.PlayerA),
                amount / 2n
            )
            Utils.buildPublicKeyHashOutput(
                pubKey2Addr(this.PlayerB),
                amount / 2n
            )
            // possibilities of playerA and PlayerB winning
        } else if (
            PlayerAMove == RockPaperScissors2.ROCK &&
            PlayerBMove == RockPaperScissors2.SCISSORS
        ) {
            Utils.buildPublicKeyHashOutput(pubKey2Addr(this.PlayerA), amount)
            assert(this.checkSig(sig, this.PlayerA))
        } else if (
            PlayerAMove == RockPaperScissors2.SCISSORS &&
            PlayerBMove == RockPaperScissors2.PAPER
        ) {
            Utils.buildPublicKeyHashOutput(pubKey2Addr(this.PlayerA), amount)
            assert(this.checkSig(sig, this.PlayerA))
        } else if (
            PlayerAMove == RockPaperScissors2.PAPER &&
            PlayerBMove == RockPaperScissors2.ROCK
        ) {
            Utils.buildPublicKeyHashOutput(pubKey2Addr(this.PlayerA), amount)
            assert(this.checkSig(sig, this.PlayerA))
        } else if (
            PlayerBMove == RockPaperScissors2.ROCK &&
            PlayerAMove == RockPaperScissors2.SCISSORS
        ) {
            Utils.buildPublicKeyHashOutput(pubKey2Addr(this.PlayerB), amount)
            assert(this.checkSig(sig, this.PlayerB))
        } else if (
            PlayerBMove == RockPaperScissors2.SCISSORS &&
            PlayerAMove == RockPaperScissors2.PAPER
        ) {
            Utils.buildPublicKeyHashOutput(pubKey2Addr(this.PlayerB), amount)
            assert(this.checkSig(sig, this.PlayerB))
        } else if (
            PlayerBMove == RockPaperScissors2.PAPER &&
            PlayerAMove == RockPaperScissors2.ROCK
        ) {
            Utils.buildPublicKeyHashOutput(pubKey2Addr(this.PlayerB), amount)
            assert(this.checkSig(sig, this.PlayerB))
        }
        assert(true)
    }
}
