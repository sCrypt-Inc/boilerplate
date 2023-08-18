import { expect } from 'chai'
import { PubKeyHash, toHex } from 'scrypt-ts'
import { AnyoneCanSpend } from '../src/contracts/acs'
import { myPublicKeyHash } from './utils/privateKey'
import { getDefaultSigner } from './utils/helper'

describe('Test SmartContract `AnyoneCanSpend`', () => {
    before(async () => {
        await AnyoneCanSpend.compile()
    })

    it('should transpile contract `AnyoneCanSpend` successfully.', async () => {
        const anyoneCanSpend = new AnyoneCanSpend(
            PubKeyHash(toHex(myPublicKeyHash))
        )
        await anyoneCanSpend.connect(getDefaultSigner())
        const deployTx = await anyoneCanSpend.deploy(1)
        console.log('AnyoneCanSpend contract deployed: ', deployTx.id)
        const { tx: callTx, atInputIndex } =
            await anyoneCanSpend.methods.unlock()
        console.log('AnyoneCanSpend contract called: ', callTx.id)
        const result = callTx.verifyScript(atInputIndex)
        expect(result.success, result.error).to.eq(true)
    })
})
