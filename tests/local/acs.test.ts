import { expect } from 'chai'
import { MethodCallOptions, PubKeyHash, toHex } from 'scrypt-ts'
import { AnyoneCanSpend } from '../../src/contracts/acs'
import { myPublicKeyHash } from '../utils/privateKey'
import { getDummySigner, getDummyUTXO } from '../utils/helper'

describe('Test SmartContract `AnyoneCanSpend`', () => {
    before(async () => {
        await AnyoneCanSpend.compile()
    })

    it('should transpile contract `AnyoneCanSpend` successfully.', async () => {
        const anyoneCanSpend = new AnyoneCanSpend(
            PubKeyHash(toHex(myPublicKeyHash))
        )
        await anyoneCanSpend.connect(getDummySigner())

        const { tx: callTx, atInputIndex } =
            await anyoneCanSpend.methods.unlock({
                fromUTXO: getDummyUTXO(),
            } as MethodCallOptions<AnyoneCanSpend>)

        const result = callTx.verifyScript(atInputIndex)
        expect(result.success, result.error).to.eq(true)
    })
})
