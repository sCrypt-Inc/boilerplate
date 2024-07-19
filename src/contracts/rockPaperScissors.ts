import {
    ByteString,
    PubKey,
    Sha256,
    SmartContract,
    Utils,
    assert,
    hash256,
    int2ByteString,
    method,
    prop,
    pubKey2Addr,
    toByteString,
    MethodCallOptions,
    ContractTransaction,
    bsv,
} from 'scrypt-ts'

export enum Choice {
    ROCK,
    PAPER,
    SCISSORS
}

export class RockPaperScissors2 extends SmartContract {
    @prop()
    playerA: PubKey
    @prop()
    playerB: PubKey
    @prop()
    playerAHash: Sha256
    @prop()
    playerBHash: Sha256

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
            Sha256(int2ByteString(playerAMove, 1n) + playerASalt) ==
                this.playerAHash,
            'Invalid move'
        )
        assert(
            Sha256(int2ByteString(playerBMove, 1n) + playerBSalt) ==
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
                (playerAMove == BigInt(Choice.ROCK) &&
                    playerBMove == BigInt(Choice.SCISSORS)) ||
                (playerAMove == BigInt(Choice.SCISSORS) &&
                    playerBMove == BigInt(Choice.PAPER)) ||
                (playerAMove == BigInt(Choice.PAPER) &&
                    playerBMove == BigInt(Choice.ROCK))
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

    static async buildTxForPlay(
        current: RockPaperScissors2,
        options: MethodCallOptions<RockPaperScissors2>,
        playerAMove: bigint,
        playerBMove: bigint,
        playerASalt: ByteString,
        playerBSalt: ByteString
    ): Promise<ContractTransaction> {
        const defaultChangeAddress = await current.signer.getDefaultAddress()
        const balance = current.balance

        const unsignedTx: bsv.Transaction = new bsv.Transaction()
            // add contract input
            .addInput(current.buildContractInput(options.fromUTXO))

            // build output
            .addOutput(
                new bsv.Transaction.Output({
                    script: bsv.Script.fromHex(
                        Utils.buildPublicKeyHashScript(
                            pubKey2Addr(current.playerB)
                        )
                    ),
                    satoshis: Number(current.balance),
                })
            )
            // build change output
            .change(options.changeAddress || defaultChangeAddress)

        return {
            tx: unsignedTx,
            atInputIndex: 0,
            nexts: [],
        }
    }
}
