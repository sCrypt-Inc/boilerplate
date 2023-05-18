import { DefaultProvider, MethodCallOptions, PubKey, Sha256, TestWallet, bsv, findSig, toByteString, toHex } from "scrypt-ts";
import { Numbergs } from "../../src/contracts/numbergs";
import { getDummySigner, getDummyUTXO, randomPrivateKey } from '../utils/helper'

import { expect } from "chai";


async function main() {
    await Numbergs.compile()

    const [privateKeyalice, publicKeyalice] = randomPrivateKey()
    const [privateKeybob, publicKeybob] = randomPrivateKey()

    let numbergs = new Numbergs(PubKey(toHex(publicKeyalice)), PubKey(toHex(publicKeybob)), 3n, 3n)
    

    await numbergs.connect(getDummySigner([privateKeyalice, privateKeybob]))


    const {tx: callTx, atInputIndex} = await numbergs.methods.guess((sigResps) => findSig(sigResps, publicKeyalice && publicKeybob)
,{
        fromUTXO : getDummyUTXO(),
        pubKeyOrAddrToSign : publicKeyalice && publicKeybob
    } as MethodCallOptions<Numbergs>
)
const result = callTx.verifyScript(atInputIndex)
expect(result.success, result.error).to.eq(true)
}
describe('Test SmartContract `NumberGS` unit test', () => {
    it('should succeed', async () => {
        await main()
    })
})