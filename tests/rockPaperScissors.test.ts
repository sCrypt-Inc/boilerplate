import {
    MethodCallOptions,
    PubKey,
    Sha256,
    bsv,
    findSig,
    int2ByteString,
    toByteString,
    toHex,
} from 'scrypt-ts'
import { RockPaperScissors2 } from '../src/contracts/rockPaperScissors'
import { getDefaultSigner, randomPrivateKey } from './utils/helper'
import { expect, use } from 'chai'
import chaiAsPromised from 'chai-as-promised'
use(chaiAsPromised)

describe('Test SmartContract `RockPaperScirssors`', async () => {
    const [playerAprivateKey, playerApublickey] = randomPrivateKey()
    const [playerBprivateKey, playerBpublickey] = randomPrivateKey()

    const playerASalt = toByteString(bsv.PrivateKey.fromRandom().toHex())
    const playerBSalt = toByteString(bsv.PrivateKey.fromRandom().toHex())

    let instance: RockPaperScissors2

    before(async () => {
        await RockPaperScissors2.compile()

        instance = new RockPaperScissors2(
            PubKey(toHex(playerApublickey)),
            PubKey(toHex(playerBpublickey)),
            Sha256(int2ByteString(RockPaperScissors2.ROCK, 1n) + playerASalt),
            Sha256(int2ByteString(RockPaperScissors2.PAPER, 1n) + playerBSalt)
        )

        await instance.connect(
            getDefaultSigner([playerAprivateKey, playerBprivateKey])
        )
    })

    it('should pass the play method successfully ', async () => {
        await instance.deploy(10)

        instance.bindTxBuilder('play', RockPaperScissors2.buildTxForPlay)

        const callContract = async () => {
            await instance.methods.play(
                RockPaperScissors2.ROCK,
                RockPaperScissors2.PAPER,
                playerASalt,
                playerBSalt,
                {
                    pubKeyOrAddr: playerApublickey,
                } as MethodCallOptions<RockPaperScissors2>
            )
        }

        return expect(callContract()).not.be.rejected
    })

    it('should throw when using wrong salt', async () => {
        await instance.deploy(10)

        const callContract = async () => {
            await instance.methods.play(
                RockPaperScissors2.ROCK,
                RockPaperScissors2.PAPER,
                playerASalt + toByteString('00'),
                playerBSalt,
                {
                    pubKeyOrAddr: playerApublickey,
                } as MethodCallOptions<RockPaperScissors2>
            )
        }

        return expect(callContract()).to.be.rejectedWith(/Invalid move/)
    })
})
