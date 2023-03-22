import { Counter } from '../../src/contracts/counter'
import { getDefaultSigner } from '../utils/helper'
import { bsv, MethodCallOptions } from 'scrypt-ts'
import Transaction = bsv.Transaction

async function compileContract() {
    await Counter.compile()
}

async function deploy(initialCount = 100n): Promise<Transaction> {
    const instance = new Counter(initialCount)
    await instance.connect(getDefaultSigner())
    const tx = await instance.deploy(1)
    console.log(`Counter deployed: ${tx.id}, the count is: ${instance.count}`)
    return tx
}

async function callIncrementOnChain(
    tx: Transaction,
    atOutputIndex = 0
): Promise<Transaction> {
    // recover instance from tx
    const instance = Counter.fromTx(tx, atOutputIndex)

    await instance.connect(getDefaultSigner())

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
    return callTx
}

async function main() {
    await compileContract()
    let lastTx = await deploy()
    for (let i = 0; i < 5; ++i) {
        lastTx = await callIncrementOnChain(lastTx)
    }
}

describe('Test SmartContract `Counter` on testnet using `SmartContract.fromTx`', () => {
    it('should succeed', async () => {
        await main()
    })
})
