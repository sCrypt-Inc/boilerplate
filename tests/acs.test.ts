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
        await anyoneCanSpend.deploy(1)
        const callContract = async () => await anyoneCanSpend.methods.unlock()
        expect(callContract()).not.throw
    })
})
