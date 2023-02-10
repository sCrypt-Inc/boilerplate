import {
    assert,
    ByteString,
    FixedArray,
    hash256,
    method,
    prop,
    PubKey,
    Sig,
    Sha256,
    SmartContract,
    Utils,
    byteString2Int,
    sha256,
    hash160,
} from 'scrypt-ts'

// this contract simulates the Monty Hall problem
// https://xiaohuiliu.medium.com/the-monty-hall-problem-on-bitcoin-1f9be62b38e8
export class MontyHall extends SmartContract {
    @prop()
    readonly player: PubKey

    @prop()
    readonly host: PubKey

    @prop(true)
    step: bigint

    // player's choice
    @prop(true)
    choice: bigint

    // door opened by host
    @prop(true)
    openedDoor: bigint

    // number of doors
    static readonly N: number = 3

    // what's behind each door
    @prop()
    doorHashes: FixedArray<Sha256, 3>

    constructor(
        player: PubKey,
        host: PubKey,
        doorHashes: FixedArray<Sha256, 3>
    ) {
        super(...arguments)
        this.player = player
        this.host = host
        this.step = 0n
        this.choice = -1n
        this.openedDoor = -1n
        this.doorHashes = doorHashes
    }

    // step 1: the player chooses initially a random door that s/he believes has the prize
    @method()
    public choose(choice: bigint, sig: Sig) {
        assert(++this.step == 1n, 'step number unexpected')

        this.checkSig(sig, this.player)
        this.choice = choice

        // game goes on
        assert(
            this.ctx.hashOutputs ==
                hash256(this.buildStateOutput(this.ctx.utxo.value)),
            'hashOutputs check failed'
        )
    }

    // step 2: host opens a goat door
    @method()
    public open(goatDoorNum: bigint, behindDoor: ByteString, sig: Sig) {
        assert(++this.step == 2n, 'step number unexpected')

        this.checkSig(sig, this.host)

        this.openedDoor = goatDoorNum
        const goatDoorHash = this.doorHashes[Number(goatDoorNum)]
        assert(sha256(behindDoor) == goatDoorHash)
        assert(!this.isCar(behindDoor), 'expect goat, but got car')

        assert(
            this.ctx.hashOutputs ==
                hash256(this.buildStateOutput(this.ctx.utxo.value)),
            'hashOutputs check failed'
        )
    }

    // step 3: player stays or switches
    @method()
    public stay(stay: boolean, sig: Sig) {
        assert(++this.step == 3n, 'step number unexpected')
        this.checkSig(sig, this.player)

        if (!stay) {
            // switch
            this.choice = this.findUnopenedDoor()
        }

        assert(
            this.ctx.hashOutputs ==
                hash256(this.buildStateOutput(this.ctx.utxo.value)),
            'hashOutputs check failed'
        )
    }

    // step 4: reveal
    @method()
    public reveal(behindDoor: ByteString) {
        assert(++this.step == 4n, 'step number unexpected')

        const doorHash = this.doorHashes[Number(this.choice)]
        assert(sha256(behindDoor) == doorHash)

        // does the play choose a door, behind which is a car
        const won = this.isCar(behindDoor)
        const winner = won ? this.player : this.host

        // pay full amount to winner
        const winnerScript: ByteString = Utils.buildPublicKeyHashScript(
            hash160(winner)
        )
        const payoutOutput: ByteString = Utils.buildOutput(
            winnerScript,
            this.ctx.utxo.value
        )
        assert(this.ctx.hashOutputs == hash256(payoutOutput))
    }

    // if last bit is set, it is a car; otherwise, a goat
    @method()
    isCar(behindDoor: ByteString): boolean {
        return byteString2Int(behindDoor) % 2n == 1n
    }

    // find the remaining unopened door
    @method()
    findUnopenedDoor(): bigint {
        let result = -1n
        for (let i = 0n; i < MontyHall.N; i++) {
            if (i != this.choice && i != this.openedDoor) result = i
        }
        return result
    }
}
