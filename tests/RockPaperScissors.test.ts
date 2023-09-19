import {
    MethodCallOptions,
    PubKey,
    Sha256,
    findSig,
    toByteString,
    toHex,
} from 'scrypt-ts'
import { RockPaperScissors2 } from '../src/contracts/RockPaperScissors'
import { getDefaultSigner, randomPrivateKey } from './utils/helper'
import { expect, use } from 'chai'
import chaiAsPromised from 'chai-as-promised'
use(chaiAsPromised)

describe('Test SmartContract `RockPaperScirssors`', async () => {
    const [PlayerAprivateKey, PlayerApublickey] = randomPrivateKey()
    const [PlayerBprivateKey, PlayerBpublickey] = randomPrivateKey()
    await RockPaperScissors2.compile()

    const instance = new RockPaperScissors2(
        PubKey(toHex(PlayerApublickey)),
        PubKey(toHex(PlayerBpublickey)),
        Sha256(toByteString('ROCK', true)),
        Sha256(toByteString('PAPER', true))
    )

    await instance.connect(
        getDefaultSigner([PlayerAprivateKey, PlayerBprivateKey])
    )

    it('should pass the play method successfully ', async () => {
        await instance.deploy(10)

        const callContract = async () => {
            await instance.methods.play(
                2n,
                2n,
                toByteString('ROCK', true),
                toByteString('PAPER', true),
                (sigResps) => findSig(sigResps, PlayerApublickey),
                {
                    pubKeyOrAddr: PlayerApublickey,
                } as MethodCallOptions<RockPaperScissors2>
            )
            return expect(callContract()).not.be.rejected
        }
    })

    it('should throw when calling play ', async () => {
        await instance.deploy(10)
        const callContract = async () => {
            await instance.methods.play(
                2n,
                2n,
                toByteString('WRONG MOVE', true),
                toByteString('WRONG MOVE', true),
                (sigResps) => findSig(sigResps, PlayerApublickey),
                {
                    pubKeyOrAddr: PlayerApublickey,
                } as MethodCallOptions<RockPaperScissors2>
            )
            return expect(callContract()).to.be.rejectedWith(
                / play method failed/
            )
        }
    })
})
