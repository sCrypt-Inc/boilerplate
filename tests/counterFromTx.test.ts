import {
    DefaultProvider,
    TestWallet,
    MethodCallOptions,
    bsv,
} from 'scrypt-ts'
import { Counter } from '../src/contracts/counter'
import { myPrivateKey } from './utils/privateKey'

async function main() {
    const contract_id = {
        txId: '50a0736bfb78d6695d93a9af7e24a4c3a18884ac99d653131af075f59ed5a628',
        OutputIndex: 0,
    }

    await Counter.loadArtifact()
    const provider = new DefaultProvider({ network: bsv.Networks.testnet })
    const signer = new TestWallet(myPrivateKey, provider)
    try {
        let tx = new bsv.Transaction()
        tx = await provider.getTransaction(contract_id.txId)
        let instance = new Counter(100n)
        await instance.connect(signer)
      
        const nextInstance = instance.next()
        nextInstance.increment()

        const { tx: callTx } = await instance.methods.incrementOnChain({
            next: {
                instance: nextInstance,
                balance: instance.balance,
            },
        } as MethodCallOptions<Counter>)
        console.log(
            `Counter incrementOnChain called: ${callTx.id}, the count now is: ${nextInstance.count}`
        )
    } catch (e) {
        console.error('Error interacting with the contract => ', e)
    }
}
main()
