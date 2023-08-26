import { expect, use } from 'chai'
import { Test } from '../src/contracts/library'
import { L } from '../src/contracts/library'
import { getDefaultSigner } from './utils/helper'
import chaiAsPromised from 'chai-as-promised'
use(chaiAsPromised)

describe('Test SmartContract `Test`', () => {
    let instance: Test
    let l = new L(2n, 3n)

    before(async () => {
        await Test.compile()
        instance = new Test(2n, l)
        await instance.connect(getDefaultSigner())
    })

    it('should pass the public method unit test successfully.', async () => {
        const deployTx = await instance.deploy(1)
        console.log(' Library Test contract deployed: ', deployTx.id)

        const { tx: callTx, atInputIndex } = await instance.methods.unlock(
            3n
        )

        console.log('Library Test Called Successfully : ', callTx.id)

        const result = callTx.verifyScript(atInputIndex)
        expect(result.success, result.error).to.eq(true)
    })
})
