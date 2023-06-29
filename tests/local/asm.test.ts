import { expect, use } from 'chai'
import { P2PKH_ASM } from '../../src/contracts/asmDemo'
import {
    MethodCallOptions,
    PubKey,
    PubKeyHash,
    findSig,
    toHex,
} from 'scrypt-ts'
import { getDummySigner, getDummyUTXO } from '../utils/helper'
import chaiAsPromised from 'chai-as-promised'
import { myPublicKey, myPublicKeyHash } from '../utils/privateKey'

use(chaiAsPromised)

describe('Test SmartContract `P2PKH_ASM`', () => {
    let demo: P2PKH_ASM

    before(async () => {
        await P2PKH_ASM.compile()

        demo = new P2PKH_ASM(PubKeyHash(toHex(myPublicKeyHash)))
        await demo.connect(getDummySigner())
    })

    it('should pass `unlock`', async () => {
        demo.setAsmVars({
            'P2PKH_ASM.unlock.pubKeyHash': toHex(myPublicKeyHash),
        })

        const { tx: callTx, atInputIndex } = await demo.methods.unlock(
            (sigResps) => findSig(sigResps, myPublicKey),
            PubKey(toHex(myPublicKey)),
            {
                fromUTXO: getDummyUTXO(),
                pubKeyOrAddrToSign: myPublicKey,
            } as MethodCallOptions<P2PKH_ASM>
        )

        const result = callTx.verifyScript(atInputIndex)
        expect(result.success, result.error).to.eq(true)
    })
})
