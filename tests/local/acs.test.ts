import { expect } from 'chai'
import { MethodCallOptions, PubKeyHash, toHex } from 'scrypt-ts'
import { AnyoneCanSpend } from '../../src/contracts/acs'
import { myPublicKeyHash } from '../util/privateKey'
import { dummySigner, dummyUTXO } from './util/txHelper'

describe('Test SmartContract `AnyoneCanSpend`', () => {
    before(async () => {
        await AnyoneCanSpend.compile()
    })

    it('should transpile contract `AnyoneCanSpend` successfully.', async () => {
        const anyoneCanSpend = new AnyoneCanSpend(
            PubKeyHash(toHex(myPublicKeyHash))
        )
        await anyoneCanSpend.connect(dummySigner())

        const { tx: callTx, atInputIndex } =
            await anyoneCanSpend.methods.unlock({
                fromUTXO: dummyUTXO,
            } as MethodCallOptions<AnyoneCanSpend>)

        const result = callTx.verifyInputScript(atInputIndex)
        expect(result.success, result.error).to.eq(true)
    })
})
