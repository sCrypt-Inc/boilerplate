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
    const AdvancedCounter = buildContractClass(loadDesc('advancedCounter_desc.json'))
    const advCounter = new AdvancedCounter()

    // append state as passive data
    advCounter.setDataPart(num2bin(0, DataLen))

    // initial contract funding
    let amount = 10000
    const FEE = 1000

    // lock funds to the script
    const lockingTx = await createLockingTx(privateKey.toAddress(), amount)
    lockingTx.outputs[0].setScript(advCounter.lockingScript)
    lockingTx.sign(privateKey)
    let lockingTxid = await sendTx(lockingTx)
    console.log('funding txid:      ', lockingTxid)

    // Run five transactions /iterations
    for (i = 0; i < 5; i++) {
      // avoid mempool conflicts
      // sleep to allow previous tx to "sink-into" the network
      await sleep(9000);
      console.log('==============================')
      console.log('DONE SLEEPING before iteration ', i)

      const prevLockingScript = advCounter.lockingScript

      // Set the state for the next transaction
      advCounter.setDataPart(num2bin(i + 1, DataLen))

      // keep the contract funding constant
      const newAmount = amount

      const unlockingTx = await createLockingTx(privateKey.toAddress(), newAmount, FEE)

      unlockingTx.outputs[0].setScript(advCounter.lockingScript)

      // add input of prevTx contract outpoint
      unlockingTx.addInput(new bsv.Transaction.Input({
        prevTxId: lockingTxid,
        outputIndex: 0,
        script: new bsv.Script(), // placeholder
      }), prevLockingScript, amount)

      const curInputIndex = unlockingTx.inputs.length - 1

      const changeAmount = unlockingTx.inputAmount - FEE - newAmount

      const preimage = getPreimage(unlockingTx, prevLockingScript.toASM(), amount, curInputIndex, sighashType)

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
    }

    console.log('Succeeded on testnet')
  } catch (error) {
    console.log('Failed on testnet')
    showError(error)
  }
})()