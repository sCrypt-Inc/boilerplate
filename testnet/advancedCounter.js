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
  deployContract,
  sleep
} = require('../helper');
const {
  privateKey
} = require('../privateKey');



(async () => {
  try {

    const Signature = bsv.crypto.Signature
    const AdvancedCounter = buildContractClass(loadDesc('advancedCounter_debug_desc.json'))
    const advCounter = new AdvancedCounter(0)


    // initial contract funding
    let amount = 10000

    // lock funds to the script
    const lockingTx = await deployContract(advCounter, amount);
    console.log('funding txid:      ', lockingTx.id);

    let prevTx = lockingTx;
    // Run five transactions /iterations
    for (i = 0; i < 5; i++) {
      // avoid mempool conflicts
      // sleep to allow previous tx to "sink-into" the network
      console.log('==============================')
      console.log('DONE SLEEPING before iteration ', i)
      await sleep(6)

      // keep the contract funding constant

      const newLockingScript = advCounter.getNewStateScript({ counter: i + 1 })

      const unlockingTx = new bsv.Transaction();

      unlockingTx
        .addInput(createInputFromPrevTx(prevTx))
        .addOutput(new bsv.Transaction.Output({
          script: newLockingScript,
          satoshis: amount,
        }))
        .setInputScript(0, (tx, output) => {
          const preimage = getPreimage(
            tx,
            output.script,
            output.satoshis,
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