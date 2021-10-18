const {
  buildContractClass,
  num2bin,
  getPreimage,
  toHex,
  bsv,
  Ripemd160,
  SigHashPreimage
} = require('scryptlib');
const {
  loadDesc,
  showError,
  createLockingTx,
  createUnlockingTx,
  anyOnePayforTx,
  sendTx,
  DataLen,
  unlockP2PKHInput
} = require('../helper');
const {
  privateKey
} = require('../privateKey');

const Signature = bsv.crypto.Signature
const sighashType = Signature.SIGHASH_ANYONECANPAY | Signature.SIGHASH_SINGLE | Signature.SIGHASH_FORKID

const publicKey = privateKey.publicKey
// PKH for receiving change from each transaction (20 bytes - 40 hexadecimal characters)
const pkh = bsv.crypto.Hash.sha256ripemd160(publicKey.toBuffer())

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

(async () => {
  try {
    const AdvancedCounter = buildContractClass(loadDesc('advancedCounter_debug_desc.json'))
    const advCounter = new AdvancedCounter(0)


    // initial contract funding
    let amount = 1000

    // lock funds to the script
    const lockingTx = await createLockingTx(privateKey.toAddress(), amount, advCounter.lockingScript);
    lockingTx.sign(privateKey)
  
    let lockingTxid = await sendTx(lockingTx)
    console.log('funding txid:      ', lockingTxid)

    // Run five transactions /iterations
    for (i = 0; i < 5; i++) {
      // avoid mempool conflicts
      // sleep to allow previous tx to "sink-into" the network
      await sleep(5000);
      console.log('==============================')
      console.log('DONE SLEEPING before iteration ', i)


      // keep the contract funding constant

      const newLockingScript = advCounter.getStateScript({counter: i +1})

      const unlockingTx = await createUnlockingTx(lockingTxid, amount, advCounter.lockingScript, amount, newLockingScript)

      const curInputIndex = unlockingTx.inputs.length - 1;

      const preimage = getPreimage(unlockingTx, advCounter.lockingScript, amount, curInputIndex, sighashType)

      const unlockingScript = advCounter.increment(
        new SigHashPreimage(toHex(preimage))
      ).toScript()

      // unlock contract input
      unlockingTx.inputs[curInputIndex].setScript(unlockingScript)
      
      // add input to pay tx fee
      await anyOnePayforTx(unlockingTx, privateKey.toAddress())

      // unlock other p2pkh inputs
      for (let i = 1; i < unlockingTx.inputs.length; i++) {
        unlockP2PKHInput(privateKey, unlockingTx, i, sighashType)
      }

      lockingTxid = await sendTx(unlockingTx)
      console.log('iteration #' + i + ' txid: ', lockingTxid)

      // update state
      advCounter.counter = i + 1;
    }

    console.log('Succeeded on testnet')
  } catch (error) {
    console.log('Failed on testnet')
    showError(error)
  }
})()