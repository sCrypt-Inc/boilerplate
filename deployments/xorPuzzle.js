/**
 * Testnet test xorPuzzle contract in JavaScript
 **/
const {
  bsv,
  buildContractClass,
  PubKey,
  Sig,
  signTx,
  toHex,
  Bytes,
} = require('scryptlib');
const {
  loadDesc,
  createUnlockingTx,
  createLockingTx,
  sendTx,
  showError,
  padLeadingZero
} = require('../helper');
const { privateKey } = require('../privateKey');

// for xor with publicKeyA
const data = '9999';
const dataBuf = Buffer.from(data);
const dataBufHash = bsv.crypto.Hash.sha256(dataBuf);
const dataBufHashHex = toHex(dataBufHash);
const dataBufHashBI = BigInt('0x' + dataBufHashHex);

// for output of locking transaction
const privateKeyA = new bsv.PrivateKey.fromRandom('testnet');
console.log(`Private key generated: '${privateKeyA.toWIF()}'`);
const publicKeyA = privateKeyA.publicKey;
const publicKeyAHex = toHex(publicKeyA);

const publicKeyData = publicKeyAHex + dataBufHashHex;

const dataBuffer = Buffer.from(publicKeyData, 'hex');
const publicKeyDataHash = bsv.crypto.Hash.sha256(dataBuffer);
const publicKeyDataHashHex = toHex(publicKeyDataHash);

const publicKeyDataHashBI = BigInt('0x' + publicKeyDataHashHex);

const xorResult = dataBufHashBI ^ publicKeyDataHashBI;
let xorResultHex = padLeadingZero(xorResult.toString(16));

const privateKeyB = new bsv.PrivateKey.fromRandom('testnet');
console.log(`Private key generated: '${privateKeyB.toWIF()}'`);
const addressB = privateKeyB.toAddress();

(async () => {
  try {
    const amount = 1000;
    const newAmount = 546;

    const XorPuzzle = buildContractClass(loadDesc('xorPuzzle_desc.json'));
    const xorPuzzle = new XorPuzzle(new Bytes(xorResultHex));

    // lock fund to the script
    const lockingTx = await createLockingTx(privateKey.toAddress(), amount);
    lockingTx.outputs[0].setScript(xorPuzzle.lockingScript);
    lockingTx.sign(privateKey);
    let lockingTxid = await sendTx(lockingTx);
    console.log('funding txid:      ', lockingTxid);

    // unlock
    const prevLockingScript = xorPuzzle.lockingScript.toASM();
    const newLockingScript = bsv.Script.buildPublicKeyHashOut(addressB).toASM();

    const unlockingTx = await createUnlockingTx(
      lockingTxid,
      amount,
      prevLockingScript,
      newAmount,
      newLockingScript
    );

    const sig = signTx(unlockingTx, privateKeyA, prevLockingScript, amount);
    const unlockingScript = xorPuzzle
      .unlock(
        new Sig(toHex(sig)),
        new PubKey(toHex(publicKeyA)),
        new Bytes(dataBufHashHex)
      )
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
