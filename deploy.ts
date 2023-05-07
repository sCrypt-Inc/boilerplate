import { Numbergs } from './src/contracts/numbergs'
import { myPrivateKey, myPublicKey } from './tests/utils/privateKey'
import { getDefaultSigner } from './tests/testnet/utils/txHelper'
import { PubKey, toHex } from 'scrypt-ts'



(async () => {
    await Numbergs.compile()
    const privateKeyAlice = myPrivateKey
    const publicKeyAlice = myPublicKey

    const privateKeyBob = myPrivateKey
    const publicKeyBob = myPublicKey
    const instance = new Numbergs(PubKey(toHex(publicKeyAlice)), PubKey(toHex(publicKeyBob)), 3n, 3n)

    // connect to a signer
    await instance.connect(getDefaultSigner())

    // contract deployment
    const amount = 1
    const deployTx = await instance.deploy(amount)
    console.log('######################################################################')
    console.log('Starting Deploying..........................')
    console.log('Numbergs contract deployed: ', deployTx.id)
    console.log('ScriptSize : ',instance.scriptSize)
    console.log('Amount locked in the contract : ',amount)
    console.log('######################################################################')
})()
