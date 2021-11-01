/**
 * Testnet deployment for AnyoneCanSpend contract in JavaScript
 **/
const {
  bsv,
  buildContractClass,
  getPreimage,
  toHex,
  Ripemd160,
  SigHashPreimage,
} = require('scryptlib');
const {
  loadDesc,
  createInputFromPrevTx,
  sendTx,
  showError,
  deployContract
} = require('../helper');
const { privateKey } = require('../privateKey');

(async () => {
  const Signature = bsv.crypto.Signature;

  const privateKeyX = new bsv.PrivateKey.fromRandom('testnet');
  console.log(`Private key generated: '${privateKeyX.toWIF()}'`);

  const publicKeyX = bsv.PublicKey.fromPrivateKey(privateKeyX);
  const publicKeyHashX = bsv.crypto.Hash.sha256ripemd160(publicKeyX.toBuffer());
  const addressX = privateKeyX.toAddress();

  const amount = 2000;

  try {
    // initialize contract
    const AnyoneCanSpend = buildContractClass(loadDesc('acs_debug_desc.json'));
    const acs = new AnyoneCanSpend(new Ripemd160(toHex(publicKeyHashX)));

    // deploy contract on testnet
    const lockingTx = await deployContract(acs, amount);
    console.log('funding txid:      ', lockingTx.id);

    // call contract method on testnet
    const newLockingScript = bsv.Script.buildPublicKeyHashOut(addressX);

    const newAmount = amount - 1000; //minFee;

    const unlockingTx = new bsv.Transaction();
    unlockingTx.addInput(createInputFromPrevTx(lockingTx))
      .addOutput(new bsv.Transaction.Output({
        script: newLockingScript,
        satoshis: newAmount,
      }))
      .setInputScript(0, (tx, _) => {
        const preimage = getPreimage(
          tx,
          acs.lockingScript,
          amount,
          0,
          Signature.SIGHASH_ANYONECANPAY |
          Signature.SIGHASH_ALL |
          Signature.SIGHASH_FORKID
        );
        return acs
          .unlock(new SigHashPreimage(toHex(preimage)))
          .toScript();
      });

    const unlockingTxid = await sendTx(unlockingTx);
    console.log('unlocking txid:   ', unlockingTxid);

    console.log('Succeeded on testnet');
  } catch (error) {
    console.log('Failed on testnet');
    showError(error);
  }
})();
