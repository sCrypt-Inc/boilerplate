import { expect } from 'chai'
import { PubKeyHash, toHex } from 'scrypt-ts'
import { EnforceRecipient } from '../src/contracts/enforceRecipient'
import { myPublicKeyHash } from './utils/privateKey'
import { getDefaultSigner } from './utils/helper'

describe('Test SmartContract `EnforceRecipient`', () => {
    before(async () => {
        await EnforceRecipient.compile()
    })

    it('should transpile contract `EnforceRecipient` successfully.', async () => {
        const enforceRecipient = new EnforceRecipient(
            PubKeyHash(toHex(myPublicKeyHash))
        )
        await enforceRecipient.connect(getDefaultSigner())
        await enforceRecipient.deploy(1)
        const callContract = async () => await enforceRecipient.methods.unlock()
        expect(callContract()).not.throw
    })
})
