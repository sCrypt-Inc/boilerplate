/**
 * Testnet test for HashPuzzle contract in JavaScript
 **/
const {
  bsv,
  buildContractClass,
  toHex,
  Bytes,
  Sha256
} = require('scryptlib');
const {
  loadDesc,
  createUnlockingTx,
  createLockingTx,
  sendTx,
  showError
} = require('../helper');
const {
  privateKey
} = require('../privateKey');

// NIST Test Vectors (https://www.nist.gov/itl/ssd/software-quality-group/nsrl-test-data)
const dataBuffer = Buffer.from("abc");
const data = dataBuffer
const sha256Data = bsv.crypto.Hash.sha256(dataBuffer);

(async () => {
  try {
    const amount = 1000
    const newAmount = 546

    const HashPuzzle = buildContractClass(loadDesc('hashpuzzle_desc.json'));
    const hashPuzzle = new HashPuzzle(new Sha256(toHex(sha256Data)))

    // lock fund to the script
    const lockingTx = await createLockingTx(privateKey.toAddress(), amount)
    lockingTx.outputs[0].setScript(hashPuzzle.lockingScript)
    lockingTx.sign(privateKey)
    let lockingTxid = await sendTx(lockingTx)
    console.log('funding txid:      ', lockingTxid)

    // unlock
    const unlockingTx = await createUnlockingTx(lockingTxid, amount, hashPuzzle.lockingScript.toASM(), newAmount)
    const unlockingScript = hashPuzzle.verify(new Bytes(toHex(data))).toScript()
    unlockingTx.inputs[0].setScript(unlockingScript)
    const unlockingTxid = await sendTx(unlockingTx)
    console.log('unlocking txid:   ', unlockingTxid)

    console.log('Succeeded on testnet')
  } catch (error) {
    console.log('Failed on testnet')
    showError(error)
  }
})()