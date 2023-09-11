import {
    ByteString,
    Constants,
    PubKey,
    Addr,
    Ripemd160,
    Sig,
    SmartContract,
    Utils,
    assert,
    byteString2Int,
    hash256,
    int2ByteString,
    len,
    method,
    slice,
    toByteString,
    prop,
    hash160,
    pubKey2Addr,
} from 'scrypt-ts'

/**
 * Two players play Rock Paper Scissors
 *
 * Game start by player A, put some bsv in the contract,
 * then player B follow, put half bsv in the contract,
 * then player A finish it.
 */
export class RockPaperScissors extends SmartContract {
    @prop()
    static readonly INIT: bigint = 0n
    @prop()
    static readonly ROCK: bigint = 1n
    @prop()
    static readonly PAPER: bigint = 2n
    @prop()
    static readonly SCISSORS: bigint = 3n
    @prop()
    static readonly DataLen: bigint = 1n

    @method()
    public follow(action: bigint, playerBpkh: Addr, satoshiAmount: bigint) {
        // valid action
        assert(action > 0n && action < 4n)

        const lockingScript: ByteString = this.ctx.utxo.script
        const scriptLen = len(lockingScript)

        // init action
        const initAction: bigint = byteString2Int(
            slice(lockingScript, scriptLen - RockPaperScissors.DataLen)
        )
        assert(initAction == RockPaperScissors.INIT)

        const satoshiInit: bigint = this.ctx.utxo.value
        const codePart: ByteString = slice(
            lockingScript,
            scriptLen - Constants.PubKeyHashLen - RockPaperScissors.DataLen
        )

        const outputScript0: ByteString =
            codePart +
            playerBpkh +
            int2ByteString(action, RockPaperScissors.DataLen)
        const output0: ByteString = Utils.buildOutput(
            outputScript0,
            (satoshiInit * 3n) / 2n
        )

        const lockingScript1: ByteString =
            Utils.buildPublicKeyHashScript(playerBpkh)
        const output1: ByteString = Utils.buildOutput(
            lockingScript1,
            satoshiAmount
        )

        const output = output0 + output1

        assert(hash256(output) == this.ctx.hashOutputs)
    }

    @method()
    public finish(
        action: bigint,
        sig: Sig,
        playerA: PubKey,
        satoshiAmountA: bigint
    ) {
        // valid action
        assert(action > 0n && action < 4n)

        const satoshiTotal: bigint = this.ctx.utxo.value
        const lockingScript: ByteString = this.ctx.utxo.script
        const scriptLen = len(lockingScript)

        const bAction: bigint = byteString2Int(
            slice(lockingScript, scriptLen - RockPaperScissors.DataLen)
        )
        assert(bAction != RockPaperScissors.INIT)

        const playerAdata: Ripemd160 = Ripemd160(
            slice(
                lockingScript,
                scriptLen -
                    Constants.PubKeyHashLen * 2n -
                    RockPaperScissors.DataLen,
                scriptLen - Constants.PubKeyHashLen - RockPaperScissors.DataLen
            )
        )
        // authorize
        assert(
            hash160(
                int2ByteString(action, RockPaperScissors.DataLen) + playerA
            ) == playerAdata
        )
        assert(this.checkSig(sig, playerA))

        let satoshiAmountB: bigint = (satoshiTotal * 1n) / 3n
        if (action == (bAction % 3n) + 1n) {
            // a win
            satoshiAmountB = 0n
        } else if (bAction == (action % 3n) + 1n) {
            // a lose
            satoshiAmountB = (satoshiTotal * 2n) / 3n
        }

        const playerApkh: Addr = pubKey2Addr(playerA)
        const output0: ByteString = Utils.buildPublicKeyHashOutput(
            playerApkh,
            satoshiAmountA
        )

        let output1: ByteString = toByteString('')
        if (satoshiAmountB > 0n) {
            const playerBpkh: Ripemd160 = Ripemd160(
                slice(
                    lockingScript,
                    scriptLen -
                        Constants.PubKeyHashLen -
                        RockPaperScissors.DataLen,
                    scriptLen - RockPaperScissors.DataLen
                )
            )
            output1 = Utils.buildPublicKeyHashOutput(playerBpkh, satoshiAmountB)
        }

        const output: ByteString = output0 + output1
        assert(hash256(output) == this.ctx.hashOutputs)
    }
}
