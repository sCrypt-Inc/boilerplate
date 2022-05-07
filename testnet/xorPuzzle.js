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
  compileContract,
  createInputFromPrevTx,
  sendTx,
  showError,
  padLeadingZero,
  deployContract
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

    const XorPuzzle = buildContractClass(compileContract('xorPuzzle.scrypt'));
    const xorPuzzle = new XorPuzzle(new Bytes(xorResultHex));

    // lock fund to the script
    const lockingTx = await deployContract(xorPuzzle, amount);
    console.log('funding txid:      ', lockingTx.id);

    // unlock
    const unlockingTx = new bsv.Transaction();
    unlockingTx.addInput(createInputFromPrevTx(lockingTx))
      .setOutput(0, (tx) => {
        const newLockingScript = bsv.Script.buildPublicKeyHashOut(addressB)
        return new bsv.Transaction.Output({
          script: newLockingScript,
          satoshis: amount - tx.getEstimateFee(),
        })
      })
      .setInputScript(0, (tx, output) => {
        const sig = signTx(tx, privateKeyA, output.script, output.satoshis);
        return xorPuzzle
          .unlock(
            new Sig(toHex(sig)),
            new PubKey(toHex(publicKeyA)),
            new Bytes(dataBufHashHex)
          )
          .toScript();
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
