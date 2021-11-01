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
  deployContract,
  createInputFromPrevTx,
  fetchUtxos,
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


const privateKeys = [1, 1, 1, 1, 1].map(k => new bsv.PrivateKey.fromRandom())
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
    const AdvancedTokenSale = buildContractClass(loadDesc('advancedTokenSale_debug_desc.json'))
    const advTokenSale = new AdvancedTokenSale(satsPerToken)

    // append state as passive data
    advTokenSale.setDataPart(emptyPublicKey + '00')

    // initial contract funding - arbitrary amount
    let amount = 1000
    const FEE = 2200


    //lock funds to the script
    const lockingTx = await deployContract(advTokenSale, amount);
    console.log('funding txid:      ', lockingTx.id);

    let prevTx = lockingTx;

    // Run five transactions /iterations
    for (i = 0; i < numIterations; i++) {
      // avoid mempool conflicts
      // sleep to allow previous tx to "sink-into" the network
      console.log('==============================')
      console.log('Sleeping before iteration ', i)
      console.log('------------------------------')
      await sleep(6000);

      const numBought = boughtEachIteration[i]
      const numBoughtHex = num2bin(numBought, DataLen)
      const spendAmount = numBought * satsPerToken

      const newState = [advTokenSale.dataPart.toASM(), toHex(publicKeys[i]) + numBoughtHex].join(' ');
      // build-up a list of sales
      const newLockingScript = bsv.Script.fromASM([advTokenSale.codePart.toASM(), newState].join(' '))

      // Increase contract funding to match proceeds from sale
      // The contract expects/enforces this
      const newAmount = amount + spendAmount

      const unlockingTx = new bsv.Transaction();

      unlockingTx.addInput(createInputFromPrevTx(prevTx))
        .from(await fetchUtxos(privateKey.toAddress()))
        .addOutput(new bsv.Transaction.Output({
          script: newLockingScript,
          satoshis: newAmount,
        }))
        .change(privateKey.toAddress())
        .setInputScript(0, (tx, output) => {
          let preimage = getPreimage(
            tx,
            advTokenSale.lockingScript,
            amount,
            0,
            sighashType
          );

          return advTokenSale.buy(
            new SigHashPreimage(toHex(preimage)), // sighashPreimage
            new Ripemd160(toHex(pkh)), // changePKH
            tx.getChangeAmount(), // changeSats
            new Bytes(toHex(publicKeys[i])), // buyer's public key
            numBought // number of tokens purchased
          ).toScript();

        })
        .sign(privateKey);


      lockingTxid = await sendTx(unlockingTx)
      console.log('iteration #' + i + ' txid: ', lockingTxid)

      //update state
      advTokenSale.setDataPart(newState)

      // preserve for next iteration
      amount = newAmount
      prevTx = unlockingTx;
    }

    console.log('Succeeded on testnet')
  } catch (error) {
    console.log('Failed on testnet')
    showError(error)
    console.log(error.context)
  }
})()