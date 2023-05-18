import { Pyramid } from '../../src/contracts/pyramid'
import { getDefaultSigner } from '../utils/helper'

import { MethodCallOptions, PubKey, PubKeyHash, toHex } from 'scrypt-ts'
import { myAddress, myPublicKey, myPublicKeyHash, } from '../utils/privateKey'


async function main() {
     await Pyramid.compile()

     const recruit0PubKey = myPublicKey
     const recruit1PubKey = myPublicKey

    const pyramid = new Pyramid(PubKeyHash(toHex(myPublicKeyHash)), 1000n)
    pyramid.bindTxBuilder('recruit', Pyramid.recruitTxBuilder)

    await pyramid.connect(getDefaultSigner())

    // contract deployment
    const deployTx = await pyramid.deploy(10)
    console.log('Pyramid contract deployed: ', deployTx.id)

    // contract call `recruit`
    const { tx: callTx, next } = await pyramid.methods.recruit(
        PubKey(toHex(recruit0PubKey)), PubKey(toHex(recruit1PubKey)),
        {
            changeAddress : myAddress,
        } as MethodCallOptions<Pyramid>
    )
    console.log(' `recruit` method called : ', callTx.id)
}

describe('Test SmartContract `Pyramid` on testnet', () => {
    it('should succeed', async () => {
        await main()
    })
})
