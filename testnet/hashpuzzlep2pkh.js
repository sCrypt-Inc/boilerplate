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
  deployContract,
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

    const HashPuzzleP2PKH = buildContractClass(loadDesc('hashpuzzlep2pkh_debug_desc.json'));
    const hashPuzzle = new HashPuzzleP2PKH(new Ripemd160(toHex(pkh)), new Sha256(toHex(sha256Data)))

    // deploy contract on testnet
    const lockingTx = await deployContract(hashPuzzle, amount);
    console.log('locking txid:     ', lockingTx.id)

    // unlock
    const unlockingTx = new bsv.Transaction();

    unlockingTx.addInputFromPrevTx(lockingTx)
      .setOutput(0, (tx) => {
        const newLockingScript = bsv.Script.buildPublicKeyHashOut(privateKey.toAddress())
        return new bsv.Transaction.Output({
          script: newLockingScript,
          satoshis: amount - tx.getEstimateFee(),
        })
      })
      .setInputScript(0, (tx, output) => {
        const sig = signTx(unlockingTx, privateKey, output.script, output.satoshis)
        return hashPuzzle.verify(new Bytes(toHex(data)), new Sig(toHex(sig)), new PubKey(toHex(publicKey))).toScript()
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