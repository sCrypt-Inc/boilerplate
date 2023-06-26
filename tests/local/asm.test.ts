import { expect, use } from 'chai'
import { AsmDemo } from '../../src/contracts/asmDemo'
import { MethodCallOptions } from 'scrypt-ts'
import { getDummySigner, getDummyUTXO } from '../utils/helper'
import chaiAsPromised from 'chai-as-promised'

use(chaiAsPromised)

describe('Test SmartContract `AsmDemo`', () => {
    let demo: AsmDemo

    before(async () => {
        await AsmDemo.compile()

        demo = new AsmDemo(5n)
        await demo.connect(getDummySigner())
    })

    it('should pass `unlock`', async () => {
        demo.setAsmVars({
            'AsmDemo.unlock.x': 'OP_5',
        })

        const { tx: callTx, atInputIndex } = await demo.methods.unlock(4n, 2n, {
            fromUTXO: getDummyUTXO(),
        } as MethodCallOptions<AsmDemo>)

        const result = callTx.verifyScript(atInputIndex)
        expect(result.success, result.error).to.eq(true)
    })
})
