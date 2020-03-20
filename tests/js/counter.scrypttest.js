const path = require('path');
const { expect } = require('chai');
const { buildContractClass, bsv } = require('scrypttest');

/**
 * an example test for contract containing signature verification
 */
const { inputIndex, inputSatoshis, tx, signTx, getPreimage, toHex } = require('../testCheckSigHelper');

const privateKey = new bsv.PrivateKey.fromRandom('testnet')
const publicKey = privateKey.publicKey
const privateKey2 = new bsv.PrivateKey.fromRandom('testnet')
const outputAmount = 222222

describe('Test sCrypt contract Counter In Javascript', () => {
  let counter
  let lockingScript

  before(() => {
    const Counter = buildContractClass(path.join(__dirname, '../../contracts/counter.scrypt'), tx, inputIndex, inputSatoshis)
    counter = new Counter()
    lockingScript = demo.getScriptPubKey()
    const newScriptPubKey = lockingScript
    tx.addOutput(new bsv.Transaction.Output({
      script: newScriptPubKey,
      satoshis: outputAmount
    }))
  });

  it('signature check should succeed when right private key signs', () => {
    preimage = getPreimage(lockingScript)
    expect(counter.increment(toHex(preimage), outputAmount)).to.equal(true);
  });

  // it('signature check should fail when wrong private key signs', () => {
  //   sig = signTx(tx, privateKey2, counter.getScriptPubKey())
  //   expect(counter.unlock(toHex(sig),  toHex(publicKey))).to.equal(false);
  // });
});
