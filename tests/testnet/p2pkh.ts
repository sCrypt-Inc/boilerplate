import { P2PKH } from '../../src/contracts/p2pkh';
import { getUtxoManager } from '../utxoManager';
import { signAndSend } from '../txHelper';
import { bsv, Ripemd160, toHex } from 'scrypt-ts';

async function main() {
    const utxoMgr = await getUtxoManager();
    await P2PKH.compile();

    const privateKey = bsv.PrivateKey.fromRandom('testnet');
    const publicKey = bsv.PublicKey.fromPrivateKey(privateKey);
    const publicKeyHash = bsv.crypto.Hash.sha256ripemd160(publicKey.toBuffer());


    const p2pkh = new P2PKH(Ripemd160(toHex(publicKeyHash)));
  

    // contract deployment
    // 1. get the available utxos for the private key
    const utxos = await utxoMgr.getUtxos();
    // 2. construct a transaction for deployment
    const unsignedDeployTx = p2pkh.getDeployTx(utxos, 1000);
    // 3. sign and broadcast the transaction
    const deployTx = await signAndSend(unsignedDeployTx);
    console.log('P2PKH contract deployed: ', deployTx.id);

    // collect the new p2pkh utxo
    utxoMgr.collectUtxoFrom(deployTx);

    // contract call
    // 1. construct a transaction for call
    const unsignedCallTx = p2pkh.getCallTx(publicKey, privateKey, deployTx);
    // 2. sign and broadcast the transaction
    const callTx = await signAndSend(unsignedCallTx);
    console.log('P2PKH contract called: ', callTx.id);

    // collect the new p2pkh utxo if it exists in `callTx`
    utxoMgr.collectUtxoFrom(callTx);
}

describe('Test SmartContract `P2PKH` on testnet', () => {
    it('should success', async () => {
        await main();
    })
})