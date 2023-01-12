import { expect } from 'chai'
import { CounterRaw } from '../../src/contracts/counterRaw'
import { int2str } from 'scrypt-ts'
import { dummyUTXO } from './util/txHelper'

describe('Test SmartContract `Counter`', () => {
    before(async () => {
        await CounterRaw.compile()
    })

    it('should pass the public method unit test successfully.', async () => {
        const utxos = [dummyUTXO]

        // create a genesis instance
        let prevInstance = new CounterRaw().markAsGenesis()
        // construct a transaction for deployment
        let prevTx = prevInstance.getDeployTx(utxos, 1000)

        // multiple calls
        for (let i = 0; i < 3; i++) {
            // 1. build a new contract instance
            const newCounter = prevInstance.next()
            // 2. apply the updates on the new instance.
            newCounter.setDataPartInASM(int2str(BigInt(i + 1), 1n))
            // 3. construct a transaction for contract call
            const callTx = prevInstance.getCallTx(prevTx, newCounter)
            // 4. run `verify` method on `prevInstance`
            const result = prevInstance.verify((self) => {
                self.increment(BigInt(callTx.getOutputAmount(0)))
            })

            expect(result.success, result.error).to.be.true

            // prepare for the next iteration
            prevTx = callTx
            prevInstance = newCounter
        }
    })
})
