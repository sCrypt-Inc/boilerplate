import { use } from 'chai'
import { Counter } from '../src/contracts/counter'
import { getDefaultSigner } from './utils/helper'
import { MethodCallOptions } from 'scrypt-ts'
import chaiAsPromised from 'chai-as-promised'
use(chaiAsPromised)
describe('Test SmartContract `Counter` from tx', () => {
    before(() => {
        Counter.loadArtifact()
    })

    it('should pass the public method unit test successfully.', async () => {
        const balance = 1

        const initialCount: bigint = 100n
        const atOutputIndex = 0
        const counter = new Counter(initialCount)
        const signer = getDefaultSigner()
        await counter.connect(signer)
        const deployTx = await counter.deploy(1)

        let callTx = deployTx

        // call the method of current instance to apply the updates on chain
        for (let i = 0; i < 5; ++i) {
            const instance = Counter.fromTx(callTx, atOutputIndex)

            await instance.connect(signer)

            // create the next instance from the current
            const nextInstance = instance.next()

            // apply updates on the next instance off chain
            nextInstance.increment()

            const callRes = await instance.methods.incrementOnChain({
                next: {
                    instance: nextInstance,
                    balance: instance.balance,
                },
            } as MethodCallOptions<Counter>)
            console.log(
                `Counter incrementOnChain called: ${callTx.id}, the count now is: ${nextInstance.count}`
            )

            callTx = callRes.tx
        }
    })
})
