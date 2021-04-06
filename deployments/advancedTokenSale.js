const {
  bsv,
  buildContractClass,
  getPreimage,
  toHex,
  num2bin,
  Bytes,
  signTx,
  SigHashPreimage,
  Ripemd160
} = require('scryptlib');
const {
  DataLen,
  loadDesc,
  createLockingTx,
  sendTx,
  showError,
  unlockP2PKHInput,
  createUnlockingTx,
  anyOnePayforTx,
  emptyPublicKey
} = require('../helper');
const {
  privateKey,
  genPrivKey
} = require('../privateKey');

const Signature = bsv.crypto.Signature
const sighashType = Signature.SIGHASH_ANYONECANPAY | Signature.SIGHASH_ALL | Signature.SIGHASH_FORKID

// Token price is 1000 satoshis each
// NOTE: a price that is too low could run afoul of dust policy
const satsPerToken = 1000

// one iteration per buyer
const boughtEachIteration = [1, 3, 5, 7, 9]
const numIterations = boughtEachIteration.length


const privateKeys = [1,1,1,1,1].map(k => new bsv.PrivateKey.fromRandom())
const publicKeys = new Array(privateKeys.length)
// PKHs for receiving change from each transaction (20 bytes - 40 hexadecimal characters)
const pkh = bsv.crypto.Hash.sha256ripemd160(privateKey.publicKey.toBuffer())

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

(async () => {
  try {
    // generate public keys, and PKHs
    for (k = 0; k < privateKeys.length; k++) {
      publicKeys[k] = bsv.PublicKey.fromPrivateKey(privateKeys[k])
      
    }

    // get locking script
    const AdvancedTokenSale = buildContractClass(loadDesc('advancedTokenSale_desc.json'))
    const advTokenSale = new AdvancedTokenSale(satsPerToken)

    // append state as passive data
    advTokenSale.setDataPart(emptyPublicKey + '00')

    // initial contract funding - arbitrary amount
    let amount = 1000
    const FEE = 2000


    //lock funds to the script
    const lockingTx = await createLockingTx(privateKey.toAddress(), amount, FEE)

    lockingTx.outputs[0].setScript(advTokenSale.lockingScript)
    lockingTx.sign(privateKey)
    let lockingTxid = await sendTx(lockingTx)
    console.log('funding txid:      ', lockingTxid)
    // Run five transactions /iterations
    for (i = 0; i < numIterations; i++) {
      // avoid mempool conflicts
      // sleep to allow previous tx to "sink-into" the network
      console.log('==============================')
      console.log('Sleeping before iteration ', i)
      console.log('------------------------------')
      await sleep(9000);

      const prevLockingScript = advTokenSale.lockingScript

      const numBought = boughtEachIteration[i]
      const numBoughtHex = num2bin(numBought, DataLen)
      const spendAmount = numBought * satsPerToken

      const newState = [advTokenSale.dataPart.toASM(),  toHex(publicKeys[i]) + numBoughtHex].join(' ');
      // build-up a list of sales
      advTokenSale.setDataPart(newState)

      // Increase contract funding to match proceeds from sale
      // The contract expects/enforces this
      const newAmount = amount + spendAmount

      let unlockingTx = await createUnlockingTx(lockingTxid, amount, prevLockingScript.toASM(), newAmount, advTokenSale.lockingScript.toASM())


      unlockingTx = await anyOnePayforTx(unlockingTx, privateKey.toAddress(), FEE)


      const changeAmount = unlockingTx.inputAmount - FEE - newAmount

      const preimage = getPreimage(unlockingTx, prevLockingScript.toASM(), amount, 0, sighashType)

      const unlockingScript = advTokenSale.buy(
        new SigHashPreimage(toHex(preimage)), // sighashPreimage
        new Ripemd160(toHex(pkh)), // changePKH
        changeAmount, // changeSats
        new Bytes(toHex(publicKeys[i])), // buyer's public key
        numBought // number of tokens purchased
      ).toScript()

      // unlock contract input
      unlockingTx.inputs[0].setScript(unlockingScript)

      // unlock other p2pkh inputs
      for (let index = 1; index < unlockingTx.inputs.length; index++) {
        unlockP2PKHInput(privateKey, unlockingTx, index, sighashType)
      }


      lockingTxid = await sendTx(unlockingTx)
      console.log('iteration #' + i + ' txid: ', lockingTxid)

      // preserve for next iteration
      amount = newAmount
    }

    console.log('Succeeded on testnet')
  } catch (error) {
    console.log('Failed on testnet')
    showError(error)
    console.log(error.context)
  }
})()