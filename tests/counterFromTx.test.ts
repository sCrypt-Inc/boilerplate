import { expect, use } from 'chai'
import { Counter } from '../src/contracts/counter'
import { DefaultProvider, MethodCallOptions, TestWallet, bsv} from 'scrypt-ts'
import chaiAsPromised from 'chai-as-promised'
import { myPrivateKey } from './utils/privateKey'

use(chaiAsPromised)
describe('Test SmartContract `Counter`', () => {
    before(() => {
        Counter.loadArtifact()
    })

    it('should pass the public method unit test successfully.', async () => {
        const balance = 1

        const atOutputIndex = 0
        const provider = new DefaultProvider({network : bsv.Networks.testnet})
        const signer =  new TestWallet(myPrivateKey, provider)
        const counter = new Counter(0n)
        await counter.connect(signer)

        const deplotx = await counter.deploy(1)
        const tx = await signer.connectedProvider.getTransaction(deplotx.id)
        let instance = Counter.fromTx(tx, atOutputIndex)

        // call the method of current instance to apply the updates on chain
        for (let i = 0; i < 5; ++i) {
            // create the next instance from the current
            const nextInstance = instance.next()

            // apply updates on the next instance off chain
            nextInstance.increment()

            // call the method of current instance to apply the updates on chain
            const { tx: callTx } = await instance.methods.incrementOnChain({
                next: {
                    instance: nextInstance,
                    balance: instance.balance,
                },
            } as MethodCallOptions<Counter>)
            return expect(callTx).not.rejected;
            console.log(`Counter incrementOnChain called: ${callTx.id}, the count now is: ${nextInstance.count}`)
          
            // update the current instance reference
            instance = nextInstance
        }
        
    })
})
