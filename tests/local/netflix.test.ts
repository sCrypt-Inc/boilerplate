import { DefaultProvider, MethodCallOptions, PubKey, Sha256, TestWallet, bsv, findSig, toByteString, toHex } from "scrypt-ts";
import { Netflix } from "../../src/contracts/netflix";
import { getDummySigner, getDummyUTXO, randomPrivateKey } from '../utils/helper'

import { expect } from "chai";


async function main() {
    await Netflix.compile()

    const [privateKeyalice, publicKeyalice] = randomPrivateKey()
    const [privateKeybob, publicKeybob] = randomPrivateKey()

    let netflix = new Netflix(PubKey(toHex(publicKeyalice)), PubKey(toHex(publicKeybob)), Sha256(toByteString('hello', true)))
    
    

    await netflix.connect(getDummySigner(privateKeyalice))


    const {tx: callTx, atInputIndex} = await netflix.methods.unlock(toByteString('hello', true), (sigResps) => findSig(sigResps, publicKeyalice)
,{
        fromUTXO : getDummyUTXO(),
        pubKeyOrAddrToSign : publicKeyalice
    } as MethodCallOptions<Netflix>
)
const result = callTx.verifyScript(atInputIndex)
expect(result.success, result.error).to.eq(true)
}
describe('Test SmartContract `Netflix` unit test', () => {
    it('should succeed', async () => {
        await main()
    })
})