import { CoinToss } from '../../src/contracts/cointoss'
import { getDefaultSigner, inputSatoshis, randomPrivateKey } from '../utils/helper'
import { toByteString, sha256, PubKey, toHex, hash256, findSig } from 'scrypt-ts'


async function main() {
    
    await CoinToss.compile()

    const [aliceprivatekey,alicepublickey] = randomPrivateKey()
const [bobprivatekey,bobpublickey] = randomPrivateKey()
   let instance = new CoinToss(PubKey(toHex(alicepublickey)),PubKey(toHex(bobpublickey)),
        hash256(toByteString('alice',true)),hash256(toByteString('bob',true)),toByteString('n',true))
        await instance.connect(getDefaultSigner([aliceprivatekey,bobprivatekey]))


    // contract deployment
    const deployTx = await instance.deploy(inputSatoshis)
    console.log('`CoinToss` contract deployed: ', deployTx.id)

    // contract call
    const { tx: callTx } = await instance.methods.toss(
        toByteString('alice',true),toByteString('bob',true),(SigReps) => findSig(SigReps, alicepublickey),
    )
    console.log('`Cointoss` contract `toss` called: ', callTx.id)
}

describe('Test SmartContract `Cointoss` on testnet', () => {
    it('should succeed', async () => {
        await main()
    })
})
