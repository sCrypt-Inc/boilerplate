import { expect, use } from 'chai'
import {
    MethodCallOptions,
    PubKey,
    findSig,
    toByteString,
    toHex,
} from 'scrypt-ts'
import { xorPuzzle } from '../src/contracts/xorpuzzle'
import { getDefaultSigner } from './utils/helper'
import chaiAsPromised from 'chai-as-promised'
import { myPublicKey } from './utils/privateKey'
use(chaiAsPromised)

describe('Test SmartContract `xorPuzzle`', () => {
    let instance: xorPuzzle

    before(async () => {
        await xorPuzzle.compile()
        instance = new xorPuzzle(toByteString(''))
        await instance.connect(getDefaultSigner())
    })

    it('it should pass the public method unlock successfully ', async () => {
        await instance.deploy(1)

        const call = async () => {
            await instance.methods.unlock(
                (sigResps) => findSig(sigResps, myPublicKey),
                PubKey(toHex(myPublicKey)),
                toByteString('123456789'),
                {
                    pubKeyOrAddr: myPublicKey,
                } as MethodCallOptions<xorPuzzle>
            )
            return expect(call()).not.be.rejected
        }
    })

    it('should throw when calling unlock method ', async () => {
        await instance.deploy(1)

        const call = async () => {
            await instance.methods.unlock(0n)
            return expect(call()).to.be.rejectedWith(/solve method failed/)
        }
    })
})
