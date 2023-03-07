import { AnyoneCanSpend } from '../../src/contracts/acs'
import { getDefaultSigner, inputSatoshis } from '../utils/helper'
import { PubKeyHash, toHex } from 'scrypt-ts'
import { myPublicKeyHash } from '../utils/privateKey'

async function main() {
    await AnyoneCanSpend.compile()
    const anyoneCanSpend = new AnyoneCanSpend(
        PubKeyHash(toHex(myPublicKeyHash))
    )

    // connect to a signer
    await anyoneCanSpend.connect(getDefaultSigner())

    // contract deployment
    const deployTx = await anyoneCanSpend.deploy(inputSatoshis)
    console.log('AnyoneCanSpend contract deployed: ', deployTx.id)

    // contract call
    const { tx: callTx } = await anyoneCanSpend.methods.unlock()
    console.log('AnyoneCanSpend contract called: ', callTx.id)
}

describe('Test SmartContract `AnyoneCanSpend` on testnet', () => {
    it('should succeed', async () => {
        await main()
    })
})
