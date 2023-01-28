import { Counter } from '../../src/contracts/counter'
import { signAndSend } from './util/txHelper'
import { myPrivateKey } from './util/privateKey'
import { getUtxoManager } from './util/utxoManager'

async function main() {
    await Counter.compile()
    const utxoMgr = await getUtxoManager()

    // contract deployment
    // 1. create a genesis instance
    const counter = new Counter(0n).markAsGenesis()
    // 2. get the available utxos for the private key
    const utxos = await utxoMgr.getUtxos()
    // 3. construct a transaction for deployment
    const unsignedDeployTx = counter.getDeployTx(utxos, 1)
    // 4. sign and broadcast the transaction
    const deployTx = await signAndSend(unsignedDeployTx)
    console.log('Counter deploy tx:', deployTx.id)

    // collect the new p2pkh utxo if it exists in `deployTx`
    utxoMgr.collectUtxoFrom(deployTx)

    // fee in satoshis for `callTx`, can be estimated in local tests by calling `tx.getEstimateFee()`.
    const fee = 230
    let prevTx = deployTx
    let prevInstance = counter

    // calling contract multiple times
    for (let i = 0; i < 3; i++) {
        // 1. build a new contract instance
        const newCounter = prevInstance.next()
        // 2. apply the updates on the new instance.
        newCounter.count++
        // 3. get the available utxos for the private key
        const utxos = await utxoMgr.getUtxos(fee)
        // 4. construct a transaction for contract call
        const unsignedCallTx = prevInstance.getCallTx(utxos, prevTx, newCounter)
        // 5. sign and broadcast the transaction
        const callTx = await signAndSend(unsignedCallTx, myPrivateKey, false)
        console.log(
            'Counter call tx: ',
            callTx.id,
            ', count updated to: ',
            newCounter.count
        )

        utxoMgr.collectUtxoFrom(callTx)

        // prepare for the next iteration
        prevTx = callTx
        prevInstance = newCounter
    }
}

describe('Test SmartContract `Counter` on testnet', () => {
    it('should success', async () => {
        await main()
    })
})
