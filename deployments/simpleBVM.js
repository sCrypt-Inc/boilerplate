/**
 * Testnet test for simpleBVM contract in JavaScript
 **/
const { bsv, buildContractClass, toHex, Bytes } = require('scryptlib');
const {
  loadDesc,
  createUnlockingTx,
  createLockingTx,
  sendTx,
  showError,
} = require('../helper');
const { privateKey } = require('../privateKey');

// input script: OP_2 OP_5 OP_ADD OP_6 OP_ADD OP_7 OP_ADD OP_16 OP_SUB OP_3 OP_ADD OP_4 OP_ADD OP_8 OP_SUB
const inputScript = '525593569357936094539354935894';

const privateKeyA = new bsv.PrivateKey.fromRandom('testnet');
console.log(`Private key generated: '${privateKeyA.toWIF()}'`);
const addressA = privateKeyA.toAddress();

(async () => {
  try {
    const amount = 10000;
    const fee = 5000;
    const newAmount = 9000;

    const SimpleBVM = buildContractClass(loadDesc('simpleBVM_desc.json'));
    const simpleBVM = new SimpleBVM(3); // result = 3

    // lock fund to the script
    const lockingTx = await createLockingTx(
      privateKey.toAddress(),
      amount,
      fee
    );
    lockingTx.outputs[0].setScript(simpleBVM.lockingScript);
    lockingTx.sign(privateKey);

    let lockingTxid = await sendTx(lockingTx);
    console.log('funding txid:      ', lockingTxid);

    // unlock
    let prevLockingScript = simpleBVM.lockingScript.toASM();
    const newLockingScript = bsv.Script.buildPublicKeyHashOut(addressA).toASM();

    const unlockingTx = await createUnlockingTx(
      lockingTxid,
      amount,
      prevLockingScript,
      newAmount,
      newLockingScript
    );

    const unlockingScript = simpleBVM
      .unlock(new Bytes(toHex(inputScript)))
      .toScript();
    unlockingTx.inputs[0].setScript(unlockingScript);

    const unlockingTxid = await sendTx(unlockingTx);
    console.log('unlocking txid:   ', unlockingTxid);

    console.log('Succeeded on testnet');
  } catch (error) {
    console.log('Failed on testnet');
    showError(error);
  }
})();
