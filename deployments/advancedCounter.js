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
  sendTx,
  DataLen,
  unlockP2PKHInput
} = require('../helper');
const {
  privateKey
} = require('../privateKey');

const Signature = bsv.crypto.Signature
const sighashType = Signature.SIGHASH_ANYONECANPAY | Signature.SIGHASH_ALL | Signature.SIGHASH_FORKID

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
    let amount = 30000
    const FEE = 3000

    // lock funds to the script
    const lockingTx = await createLockingTx(privateKey.toAddress(), amount, FEE)
    lockingTx.outputs[0].setScript(advCounter.lockingScript)
    lockingTx.sign(privateKey)
    let lockingTxid = await sendTx(lockingTx)
    console.log('funding txid:      ', lockingTxid)

    // Run five transactions /iterations
    for (i = 0; i < 5; i++) {
      // avoid mempool conflicts
      // sleep to allow previous tx to "sink-into" the network
      await sleep(3000);
      console.log('==============================')
      console.log('DONE SLEEPING before iteration ', i)


      // keep the contract funding constant
      const newAmount = amount

      const unlockingTx = await createLockingTx(privateKey.toAddress(), newAmount, FEE)

      const newLockingScript = advCounter.getStateScript({counter: i +1})

      unlockingTx.outputs[0].setScript(newLockingScript)

      // add input of prevTx contract outpoint
      unlockingTx.addInput(new bsv.Transaction.Input({
        prevTxId: lockingTxid,
        outputIndex: 0,
        script: new bsv.Script(), // placeholder
      }), advCounter.lockingScript, amount)

      const curInputIndex = unlockingTx.inputs.length - 1

      const changeAmount = unlockingTx.inputAmount - FEE - newAmount

      const preimage = getPreimage(unlockingTx, advCounter.lockingScript, amount, curInputIndex, sighashType)

      const unlockingScript = advCounter.increment(
        new SigHashPreimage(toHex(preimage)),
        amount,
        new Ripemd160(toHex(pkh)),
        changeAmount
      ).toScript()

      // unlock other p2pkh inputs
      for (let i = 0; i < curInputIndex; i++) {
        unlockP2PKHInput(privateKey, unlockingTx, i, sighashType)
      }

      // unlock contract input
      unlockingTx.inputs[curInputIndex].setScript(unlockingScript)

      lockingTxid = await sendTx(unlockingTx)
      console.log('iteration #' + i + ' txid: ', lockingTxid)

      amount = newAmount

      // update state
      advCounter.counter = i + 1;
    }

    console.log('Succeeded on testnet')
  } catch (error) {
    console.log('Failed on testnet')
    showError(error)
  }
})()