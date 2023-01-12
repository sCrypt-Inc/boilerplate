import { expect } from 'chai'
import { AdvancedCounter } from '../../src/contracts/advancedCounter'
import { dummyUTXO } from './util/txHelper'

describe('Test SmartContract `AdvancedCounter`', () => {
    before(async () => {
        await AdvancedCounter.compile()
    })

    it('should pass the public method unit test successfully.', async () => {
        const utxos = [dummyUTXO]

        // create a genesis instance
        let prevInstance = new AdvancedCounter(0n).markAsGenesis()
        // construct a transaction for deployment
        let prevTx = prevInstance.getDeployTx(utxos, 1)

        // multiple calls
        for (let i = 0; i < 3; i++) {
            // 1. build a new contract instance
            const newCounter = prevInstance.next()
            // 2. apply the updates on the new instance.
            newCounter.counter++
            // 3. construct a transaction for contract call
            const callTx = prevInstance.getCallTx(utxos, prevTx, newCounter)
            // 4. run `verify` method on `prevInstance`
            const result = prevInstance.verify((self) => {
                self.increment()
            })

            expect(result.success, result.error).to.be.true

            // prepare for the next iteration
            prevTx = callTx
            prevInstance = newCounter
        }
    })
})
