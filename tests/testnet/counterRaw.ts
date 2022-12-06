import { Counter } from '../../src/contracts/counterRaw';
import { signAndSend } from '../txHelper';
import { privateKey } from '../privateKey';
import { getUtxoManager } from '../utxoManager';
import { num2bin } from 'scrypt-ts';

async function main() {
  await Counter.compile();
  const utxoMgr = await getUtxoManager();
  
  // contract deployment
  // 1. create a genesis instance
  const counter = new Counter()
  // 2. get the available utxos for the privatekey
  const utxos = await utxoMgr.getUtxos();
  // 3. construct a transaction for deployment
  const unsignedDeployTx = counter.getDeployTx(utxos, 1000);
  // 4. sign and broadcast the transaction
  const deployTx = await signAndSend(unsignedDeployTx);
  console.log('Counter deploy tx:', deployTx.id, ', dataPart: ', counter.dataPart.toASM());

  // collect the new p2pkh utxo if it exists in `deployTx`
  utxoMgr.collectUtxoFrom(deployTx);

  let prevTx = deployTx;
  let prevInstance = counter;

  // calling contract multiple times
  for (let i = 0; i < 3; i++) {
    // 1. build a new contract instance
    const newCounter = prevInstance.next();
    // 2. apply the updates on the new instance.
    newCounter.setDataPartInASM(num2bin(BigInt(i + 1), 1n))
    // 3. construct a transaction for contract call
    const unsignedCallTx = prevInstance.getCallTx(prevTx, newCounter);
    // 4. sign and broadcast the transaction
    const callTx = await signAndSend(unsignedCallTx, privateKey, false);
    console.log('Counter call tx: ', callTx.id, ', dataPart updated to: ', newCounter.dataPart.toASM());

    // prepare for the next iteration
    prevTx = callTx;
    prevInstance = newCounter;
  }
}

describe('Test SmartContract `counterRaw` on testnet', () => {
  it('should success', async () => {
    await main();
  })
})