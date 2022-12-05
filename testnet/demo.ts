import { Demo } from '../contracts/demo';
import { getUtxoManager } from '../utxoManager';

async function main() {

    const uxtoMgr = await getUtxoManager();

    await Demo.compile();

    let demo = new Demo(1n, 2n);

    const deployTx = await demo.deploy(1000, uxtoMgr);

    console.log('Demo contract deployed: ', deployTx.id)

    const calledTx = await demo.callAdd(3n, deployTx, uxtoMgr);

    console.log('Demo contract called: ', calledTx.id)
}

// main();

describe('Test SmartContract `Demo` on testnet', () => {
    it('should success', async () => {
        await main();
    })
})