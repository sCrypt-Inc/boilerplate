import { HashPuzzle } from '../../src/contracts/hashpuzzle';
import { getUtxoManager } from './util/utxoManager';
import { signAndSend } from './util/txHelper';
import { Sha256, sha256, toHex } from 'scrypt-ts';

async function main() {
    const utxoMgr = await getUtxoManager();
    await HashPuzzle.compile();

    const data = toHex(Buffer.from("abc"))
    const sha256Data = sha256(data);
    let hashPuzzle = new HashPuzzle(Sha256(sha256Data));

    // contract deployment
    // 1. get the available utxos for the private key
    const utxos = await utxoMgr.getUtxos();
    // 2. construct a transaction for deployment
    const unsignedDeployTx = hashPuzzle.getDeployTx(utxos, 1000);
    // 3. sign and broadcast the transaction
    const deployTx = await signAndSend(unsignedDeployTx);
    console.log('HashPuzzle contract deployed: ', deployTx.id);

    // collect the new p2pkh utxo
    utxoMgr.collectUtxoFrom(deployTx);

    // contract call
    // 1. construct a transaction for call
    const unsignedCallTx = hashPuzzle.getCallTx(data, deployTx);
    // 2. sign and broadcast the transaction
    const callTx = await signAndSend(unsignedCallTx);
    console.log('HashPuzzle contract called: ', callTx.id);

    // collect the new p2pkh utxo if it exists in `callTx`
    utxoMgr.collectUtxoFrom(callTx);
}

describe('Test SmartContract `HashPuzzle` on testnet', () => {
    it('should success', async () => {
        await main();
    })
})