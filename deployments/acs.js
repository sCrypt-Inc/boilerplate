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
  createUnlockingTx,
  createLockingTx,
  sendTx,
  showError,
} = require('../helper');
const { privateKey } = require('../privateKey');

(async () => {
  const Signature = bsv.crypto.Signature;
  // Note: ANYONECANPAY
  const sighashType =
    Signature.SIGHASH_ANYONECANPAY |
    Signature.SIGHASH_ALL |
    Signature.SIGHASH_FORKID;
  const inputIndex = 0;

  const privateKeyX = new bsv.PrivateKey.fromRandom('testnet');
  console.log(`Private key generated: '${privateKeyX.toWIF()}'`);

  const publicKeyX = bsv.PublicKey.fromPrivateKey(privateKeyX);
  const publicKeyHashX = bsv.crypto.Hash.sha256ripemd160(publicKeyX.toBuffer());
  const addressX = privateKeyX.toAddress();

  const amount = 2000;

  try {
    // initialize contract
    const AnyoneCanSpend = buildContractClass(loadDesc('acs_desc.json'));
    const acs = new AnyoneCanSpend(new Ripemd160(toHex(publicKeyHashX)));

    // deploy contract on testnet
    const lockingTx = await createLockingTx(privateKey.toAddress(), amount);
    lockingTx.outputs[0].setScript(acs.lockingScript);
    lockingTx.sign(privateKey);
    let lockingTxid = await sendTx(lockingTx);
    console.log('funding txid:      ', lockingTxid);

    // call contract method on testnet
    let prevLockingScript = acs.lockingScript.toASM();

    const newLockingScript = bsv.Script.buildPublicKeyHashOut(addressX).toASM();

    const newAmount = amount - 546; //minFee;

    const unlockingTx = await createUnlockingTx(
      lockingTxid,
      amount,
      prevLockingScript,
      newAmount,
      newLockingScript
    );

    const preimage = getPreimage(
      unlockingTx,
      prevLockingScript,
      amount,
      inputIndex,
      sighashType
    );

    const unlockingScript = acs
      .unlock(new SigHashPreimage(toHex(preimage)))
      .toScript();
    unlockingTx.inputs[0].setScript(unlockingScript);

    const unlockingTxid = await sendTx(unlockingTx);
    console.log('unlocking txid:   ', unlockingTxid);

    console.log('Succeeded on testnet');
  } catch (error) {
    console.log('Failed on testnet');
    showError(error);
  }
})();
