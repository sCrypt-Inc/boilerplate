import { Counter } from '../../src/contracts/counter'
import { getDefaultSigner } from '../utils/helper'
import { DefaultProvider, MethodCallOptions } from 'scrypt-ts'

async function compileContract() {
    await Counter.compile()
}

async function deploy(initialCount = 100n): Promise<string> {
    const instance = new Counter(initialCount)
    await instance.connect(getDefaultSigner())
    const tx = await instance.deploy(1)
    console.log(`Counter deployed: ${tx.id}, the count is: ${instance.count}`)
    return tx.id
}

async function callIncrementOnChain(
    txId: string,
    atOutputIndex = 0
): Promise<string> {
    // Fetch tx via provider and reconstruct contract instance
    const signer = getDefaultSigner()
    const tx = await signer.connectedProvider.getTransaction(txId)
    const instance = Counter.fromTx(tx, atOutputIndex)

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
    return callTx.id
}

async function main() {
    await compileContract()
    let lastTxId = await deploy()
    for (let i = 0; i < 5; ++i) {
        lastTxId = await callIncrementOnChain(lastTxId)
    }
}

describe('Test SmartContract `Counter` on testnet using `SmartContract.fromTx`', () => {
    it('should succeed', async () => {
        await main()
    })
})
