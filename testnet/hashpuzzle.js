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
  createInputFromPrevTx,
  deployContract,
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

    const HashPuzzle = buildContractClass(loadDesc('hashpuzzle_debug_desc.json'));
    const hashPuzzle = new HashPuzzle(new Sha256(toHex(sha256Data)))

    // deploy contract on testnet
    const lockingTx = await deployContract(hashPuzzle, amount);
    console.log('locking txid:     ', lockingTx.id)

    // unlock
    const unlockingTx = new bsv.Transaction();
            
    unlockingTx.addInput(createInputFromPrevTx(lockingTx))
    .setOutput(0, (tx) => {
        const newLockingScript = bsv.Script.buildPublicKeyHashOut(privateKey.toAddress())
        return new bsv.Transaction.Output({
            script: newLockingScript,
            satoshis: amount - tx.getEstimateFee(),
          })
    })
    .setInputScript(0, (_) => {
        return hashPuzzle.verify(new Bytes(toHex(data))).toScript()
    })
    .seal()

    const unlockingTxid = await sendTx(unlockingTx)
    console.log('unlocking txid:   ', unlockingTxid)

    console.log('Succeeded on testnet')
  } catch (error) {
    console.log('Failed on testnet')
    showError(error)
  }
})()