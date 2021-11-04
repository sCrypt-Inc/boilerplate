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
  fetchUtxos,
  createInputFromPrevTx,
  sendTx,
  deployContract
} = require('../helper');
const {
  privateKey
} = require('../privateKey');

const Signature = bsv.crypto.Signature

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
    const lockingTx = await deployContract(advCounter, amount);
    console.log('funding txid:      ', lockingTx.id);

    let prevTx = lockingTx;
    // Run five transactions /iterations
    for (i = 0; i < 5; i++) {
      // avoid mempool conflicts
      // sleep to allow previous tx to "sink-into" the network
      await sleep(5000);
      console.log('==============================')
      console.log('DONE SLEEPING before iteration ', i)


      // keep the contract funding constant

      const newLockingScript = advCounter.getNewStateScript({ counter: i + 1 })

      const unlockingTx = new bsv.Transaction();

      unlockingTx
        .feePerKb(1000)
        .addInput(createInputFromPrevTx(prevTx))
        .addOutput(new bsv.Transaction.Output({
          script: newLockingScript,
          satoshis: amount,
        }))
        .setInputScript(0, (tx, _) => {
          const preimage = getPreimage(
            tx,
            advCounter.lockingScript,
            amount,
            0,
            Signature.SIGHASH_ANYONECANPAY |
            Signature.SIGHASH_SINGLE |
            Signature.SIGHASH_FORKID
          );
          return advCounter
            .increment(new SigHashPreimage(toHex(preimage)))
            .toScript();
        })
        .from(await fetchUtxos(privateKey.toAddress()))
        .change(privateKey.toAddress())
        .sign(privateKey)
        .seal()


      lockingTxid = await sendTx(unlockingTx)
      console.log('iteration #' + i + ' txid: ', lockingTxid)

      // update state
      advCounter.counter = i + 1;

      prevTx = unlockingTx;
    }

    console.log('Succeeded on testnet')
  } catch (error) {
    console.log('Failed on testnet')
    showError(error)
  }
})()