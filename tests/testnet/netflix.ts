import { DefaultProvider, MethodCallOptions, PubKey, Sha256, TestWallet, bsv, findSig, toByteString, toHex } from "scrypt-ts";
import { Netflix } from "../../src/contracts/netflix";
import { getDefaultSigner, randomPrivateKey } from '../utils/helper'



async function main() {
    await Netflix.compile()

    const [privateKeyalice, publicKeyalice] = randomPrivateKey()
    const [privateKeybob, publicKeybob] = randomPrivateKey()

    let netflix = new Netflix(PubKey(toHex(publicKeyalice)), PubKey(toHex(publicKeybob)), Sha256(toByteString('hello', true)))
    
    

    await netflix.connect(getDefaultSigner([privateKeyalice, privateKeybob]))

    const amount  = 1
    const deployTx = await netflix.deploy(amount)
    console.log('contract `Netflix` deployed successflly : ', deployTx.id)

    const {tx: callTx} = await netflix.methods.unlock(toByteString('hello', true), (sigResps) => findSig(sigResps, publicKeyalice)
,{
        pubKeyOrAddrToSign : publicKeyalice
    } as MethodCallOptions<Netflix>
)
console.log('contract `Netflix` called successflly : ', callTx.id)
}
describe('Test SmartContract `Netflix` on testnet', () => {
    it('should succeed', async () => {
        await main()
    })
})