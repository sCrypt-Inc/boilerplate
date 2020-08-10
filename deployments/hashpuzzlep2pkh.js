/**
 * Testnet test for HashPuzzleP2PKH contract in JavaScript
 **/
const {
  bsv,
  buildContractClass,
  toHex,
  Bytes,
  signTx,
  PubKey,
  Sig,
  Ripemd160,
  Sha256
} = require('scryptlib');
const {
  DataLen,
  loadDesc,
  createUnlockingTx,
  createLockingTx,
  sendTx,
  showError
} = require('../helper');
const {
  privateKey
} = require('../privateKey');

// Test keys
const publicKey = privateKey.publicKey
const pkh = bsv.crypto.Hash.sha256ripemd160(publicKey.toBuffer())

// NIST Test Vectors (https://www.nist.gov/itl/ssd/software-quality-group/nsrl-test-data)
const dataBuffer = Buffer.from("abc");
const data = dataBuffer
const sha256Data = bsv.crypto.Hash.sha256(dataBuffer);

(async () => {
  try {
    const amount = 1000
    const newAmount = 546

    const HashPuzzleP2PKH = buildContractClass(loadDesc('hashpuzzlep2pkh_desc.json'));
    const hashPuzzle = new HashPuzzleP2PKH(new Ripemd160(toHex(pkh)), new Sha256(toHex(sha256Data)))

    // lock fund to the script
    const lockingTx = await createLockingTx(privateKey.toAddress(), amount)
    lockingTx.outputs[0].setScript(hashPuzzle.lockingScript)
    lockingTx.sign(privateKey)
    let lockingTxid = await sendTx(lockingTx)
    console.log('funding txid:      ', lockingTxid)

    // unlock
    const unlockingTx = await createUnlockingTx(lockingTxid, amount, hashPuzzle.lockingScript.toASM(), newAmount)
    const sig = signTx(unlockingTx, privateKey, hashPuzzle.lockingScript.toASM(), amount)
    const unlockingScript = hashPuzzle.verify(new Bytes(toHex(data)), new Sig(toHex(sig)), new PubKey(toHex(publicKey))).toScript()
    unlockingTx.inputs[0].setScript(unlockingScript)
    const unlockingTxid = await sendTx(unlockingTx)
    console.log('unlocking txid:   ', unlockingTxid)

    console.log('Succeeded on testnet')
  } catch (error) {
    console.log('Failed on testnet')
    showError(error)
  }
})()