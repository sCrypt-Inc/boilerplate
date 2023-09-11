import { MethodCallOptions, PubKey, findSig, toHex } from 'scrypt-ts'
import { RockPaperScissors } from '../src/contracts/rps'
import { myAddress } from './utils/privateKey'
import { getDefaultSigner, randomPrivateKey } from './utils/helper'
import { expect, use } from 'chai'
import chaiAsPromised from 'chai-as-promised'
use(chaiAsPromised)

async function main() {
    const [privateKey, publickey] = randomPrivateKey()

    await RockPaperScissors.compile()

    const instance = new RockPaperScissors()

    await instance.connect(getDefaultSigner(privateKey))

    it('should pass the follow method successfully ', async () => {
        await instance.deploy(10)

        const callContract = async () => {
            await instance.methods.follow(3n, myAddress, 12n)
            return expect(callContract()).not.be.rejected
        }
    })
    it('should pass the finished method successfully ', async () => {
        await instance.deploy(100)

        const callContract = async () => {
            await instance.methods.finished(
                3n,
                (sigResps) => findSig(sigResps, publickey),
                PubKey(publickey.toByteString()),
                2n,
                {
                    pubKeyOrAddr: publickey,
                } as MethodCallOptions<RockPaperScissors>
            )
            return expect(callContract()).not.be.rejected
        }
    })

    it('should throw when calling follow ', async () => {
        await instance.deploy(10)

        const callContract = async () => {
            await instance.methods.follow(6n, myAddress, 12n)
            return expect(callContract()).to.be.rejectedWith(
                / follow method failed/
            )
        }
    })
    it('should throw when calling finished ', async () => {
        await instance.deploy(100)
        const callContract = async () => {
            await instance.methods.finished(
                6n,
                (sigResps) => findSig(sigResps, publickey),
                PubKey(publickey.toByteString()),
                2n,
                {
                    pubKeyOrAddr: publickey,
                } as MethodCallOptions<RockPaperScissors>
            )
            return expect(callContract()).to.be.rejectedWith(
                / finish method failed/
            )
        }
    })
}
describe('Test SmartContract `RockPaperScirssors`', async () => {
    await main()
})
