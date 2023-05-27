import { Demo } from '../../src/contracts/demo'
import { Scrypt, ScryptProvider, TestWallet, bsv } from 'scrypt-ts'
import { myPrivateKey } from '../utils/privateKey'

async function main() {
    await Demo.compile()

    Scrypt.init({
        apiKey: 'alpha_test_api_key',
        network: bsv.Networks.testnet,
    })

    const signer = new TestWallet(myPrivateKey)

    await signer.connect(new ScryptProvider())

    const demo = new Demo(1n, 2n)
    await demo.connect(signer)

    const balance = 1

    const deployTx = await demo.deploy(balance)
    console.log('contract Voting deployed: ', deployTx.id)

    const contractId = {
        /** The deployment transaction id */
        txId: deployTx.id,
        /** The output index */
        outputIndex: 0,
    }

    const currentInstance = await Scrypt.contractApi.getLatestInstance(
        Demo,
        contractId
    )

    await currentInstance.connect(signer)
    // call the method of current instance to apply the updates on chain
    const { tx } = await currentInstance.methods.add(3n)

    console.log(`Demo contract called,  tx: ${tx.id}`)
}

describe('Test SmartContract `Demo`  on testnet', () => {
    it('should succeed', async () => {
        await main()
    })
})
