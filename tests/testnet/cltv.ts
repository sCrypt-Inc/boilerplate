import { CheckLockTimeVerify } from '../../src/contracts/cltv'
import { getUtxoManager } from './util/utxoManager'
import { signAndSend } from './util/txHelper'

async function main() {
    const utxoMgr = await getUtxoManager()
    await CheckLockTimeVerify.compile()

    const timeNow = Math.floor(Date.now() / 1000)
    const lockTimeMin = BigInt(timeNow - 10000)

    const cltv = new CheckLockTimeVerify(lockTimeMin)

    // contract deployment
    // 1. get the available utxos for the private key
    const utxos = await utxoMgr.getUtxos()
    // 2. construct a transaction for deployment
    const deployTx = cltv.getDeployTx(utxos, 1000)
    // 3.sign and broadcast the transaction
    const res = await signAndSend(deployTx)
    console.log('CLTV contract deployed: ', res.id)

    // collect the new UTXO
    utxoMgr.collectUtxoFrom(deployTx)

    // contract call
    // 1. construct a transaction for call
    const unsignedCallTx = cltv.getCallTxForUnlock(timeNow, deployTx)
    // 2.  broadcast the transaction
    const callTx = await signAndSend(unsignedCallTx)
    console.log('CLTV contract called: ', callTx.id)
    // callTx is a non-final tx, don't collect it here.
    // utxoMgr.collectUtxoFrom(callTx)
}

describe('Test SmartContract `CheckLockTimeVerify` on testnet', () => {
    it('should succeed', async () => {
        await main()
    })
})
