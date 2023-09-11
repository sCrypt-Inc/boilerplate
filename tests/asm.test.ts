import { expect, use } from 'chai'
import { P2PKH_ASM } from '../src/contracts/asmDemo'
import { Addr, MethodCallOptions, PubKey, findSig, toHex } from 'scrypt-ts'
import { getDefaultSigner } from './utils/helper'
import chaiAsPromised from 'chai-as-promised'
import { myPublicKey, myAddress } from './utils/privateKey'

use(chaiAsPromised)

describe('Test SmartContract `P2PKH_ASM`', () => {
    let demo: P2PKH_ASM

    before(async () => {
        P2PKH_ASM.loadArtifact()

        demo = new P2PKH_ASM(Addr(myAddress.toByteString()))
        await demo.connect(getDefaultSigner())
    })

    it('should pass `unlock`', async () => {
        demo.setAsmVars({
            'P2PKH_ASM.unlock.address': myAddress.toByteString(),
        })

        await demo.deploy(1)
        const callContract = async () =>
            await demo.methods.unlock(
                (sigResps) => findSig(sigResps, myPublicKey),
                PubKey(myPublicKey.toByteString()),
                {
                    pubKeyOrAddrToSign: myPublicKey,
                } as MethodCallOptions<P2PKH_ASM>
            )
        expect(callContract()).to.be.not.throw
    })
})
