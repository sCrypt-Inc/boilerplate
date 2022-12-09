/**
 * Testnet test for simpleBVM contract in JavaScript
 **/
const { bsv, buildContractClass, toHex, Bytes } = require('scryptlib');
const {
  loadDesc,
  deployContract,
  sendTx,
  showError,
} = require('../helper');
const { privateKey } = require('../privateKey');

// input script: OP_2 OP_5 OP_ADD OP_6 OP_ADD OP_7 OP_ADD OP_16 OP_SUB OP_3 OP_ADD OP_4 OP_ADD OP_8 OP_SUB
const inputScript = '525593569357936094539354935894';

(async () => {
  try {
    const amount = 1000;

    const SimpleBVM = buildContractClass(loadDesc('simpleBVM_debug_desc.json'));
    const simpleBVM = new SimpleBVM(3); // result = 3

    // deploy contract on testnet
    const lockingTx = await deployContract(simpleBVM, amount);
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
      .setInputScript(0, (_) => {
        return simpleBVM
        .unlock(new Bytes(toHex(inputScript)))
        .toScript()
      })
      .seal()


    const unlockingTxid = await sendTx(unlockingTx);
    console.log('unlocking txid:   ', unlockingTxid);

    console.log('Succeeded on testnet');
  } catch (error) {
    console.log('Failed on testnet');
    showError(error);
  }
})();
