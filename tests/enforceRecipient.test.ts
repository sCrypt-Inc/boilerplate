import { expect } from 'chai'
import { Addr } from 'scrypt-ts'
import { EnforceRecipient } from '../src/contracts/enforceRecipient'
import { myAddress } from './utils/privateKey'
import { getDefaultSigner } from './utils/helper'

describe('Test SmartContract `EnforceRecipient`', () => {
    before(() => {
        EnforceRecipient.loadArtifact()
    })

    it('should transpile contract `EnforceRecipient` successfully.', async () => {
        const enforceRecipient = new EnforceRecipient(
            Addr(myAddress.toByteString())
        )
        await enforceRecipient.connect(getDefaultSigner())
        await enforceRecipient.deploy(1)
        const callContract = async () => enforceRecipient.methods.unlock()
        return expect(callContract()).not.rejected
    })
})
