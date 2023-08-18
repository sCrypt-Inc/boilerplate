import { Ackermann } from '../src/contracts/ackermann'
import { expect, use } from 'chai'
import chaiAsPromised from 'chai-as-promised'
import { getDefaultSigner } from './utils/helper'

use(chaiAsPromised)

describe('Test SmartContract `Ackermann`', () => {
    let ackermann: Ackermann

    before(async () => {
        await Ackermann.compile()
        ackermann = new Ackermann(2n, 1n)

        await ackermann.connect(getDefaultSigner())
    })

    it('should transpile contract `Ackermann` successfully.', async () => {
        const deployTx = await ackermann.deploy(1)
        console.log('Ackermann contract deployed: ', deployTx.id)
        const { tx: callTx, atInputIndex } = await ackermann.methods.unlock(5n)
        console.log('Ackermann contract called: ', callTx.id)
        const result = callTx.verifyScript(atInputIndex)
        expect(result.success, result.error).to.eq(true)
    })

    it('should throw', async () => {
        return expect(ackermann.methods.unlock(4n)).to.be.rejectedWith(
            /Wrong solution/
        )
    })
})
