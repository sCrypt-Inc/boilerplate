import { getUtxoManager } from '../utxoManager';
import { signAndSend } from '../txHelper';
import { Ackermann } from '../../src/contracts/ackermann';

async function main() {
    const utxoMgr = await getUtxoManager();
    await Ackermann.compile();

    let ackermann = new Ackermann(2n, 1n);

    // contract deployment
    // 1. get the available utxos for the private key
    const utxos = await utxoMgr.getUtxos();
    // 2. construct a transaction for deployment
    const unsignedDeployTx = ackermann.getDeployTx(utxos, 1000);
    // 3. sign and broadcast the transaction
    const deployTx = await signAndSend(unsignedDeployTx);
    console.log('Ackermann contract deployed: ', deployTx.id);

    // collect the new p2pkh utxo
    utxoMgr.collectUtxoFrom(deployTx);

    // contract call
    // 1. construct a transaction for call
    const unsignedCallTx = ackermann.getCallTx(5n, deployTx);
    // 2. sign and broadcast the transaction
    const callTx = await signAndSend(unsignedCallTx);
    console.log('Ackermann contract called: ', callTx.id);

    // collect the new p2pkh utxo if it exists in `callTx`
    utxoMgr.collectUtxoFrom(callTx);
}

describe('Test SmartContract `Ackermann` on testnet', () => {
    it('should success', async () => {
        await main();
    })
})