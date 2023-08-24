import { expect, use } from 'chai'
import { P2PKH_ASM } from '../src/contracts/asmDemo'
import {
    MethodCallOptions,
    PubKey,
    PubKeyHash,
    findSig,
    toHex,
} from 'scrypt-ts'
import { getDefaultSigner } from './utils/helper'
import chaiAsPromised from 'chai-as-promised'
import { myPublicKey, myPublicKeyHash } from './utils/privateKey'

use(chaiAsPromised)

describe('Test SmartContract `P2PKH_ASM`', () => {
    let demo: P2PKH_ASM

    before(async () => {
        await P2PKH_ASM.compile()

        demo = new P2PKH_ASM(PubKeyHash(toHex(myPublicKeyHash)))
        await demo.connect(getDefaultSigner())
    })

    it('should pass `unlock`', async () => {
        demo.setAsmVars({
            'P2PKH_ASM.unlock.pubKeyHash': toHex(myPublicKeyHash),
        })

        await demo.deploy(1)
        const callContract = async () =>
            await demo.methods.unlock(
                (sigResps) => findSig(sigResps, myPublicKey),
                PubKey(toHex(myPublicKey)),
                {
                    pubKeyOrAddrToSign: myPublicKey,
                } as MethodCallOptions<P2PKH_ASM>
            )
        expect(callContract()).to.be.not.throw
    })
})
