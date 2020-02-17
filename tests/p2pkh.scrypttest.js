const path = require('path');
const { expect } = require('chai');
const { buildContractClass, bsv } = require('scrypttest');

/**
 * an example test for contract containing signature verification
 */
const { inputIndex, inputSatoshis, tx, signTx, toHex } = require('./testCheckSig');

const privateKey = new bsv.PrivateKey.fromRandom('testnet')
const publicKey = privateKey.publicKey
const pkh = bsv.crypto.Hash.sha256ripemd160(publicKey.toBuffer())
const privateKey2 = new bsv.PrivateKey.fromRandom('testnet')

describe('Test sCrypt contract DemoP2PKH', () => {
  let demo
  let sig

  before(() => {
    const DemoP2PKH = buildContractClass(path.join(__dirname, '../contracts/p2pkh.scrypt'), tx, inputIndex, inputSatoshis)
    demo = new DemoP2PKH(toHex(pkh))
  });

  it('signature check should succeed when right private key signs', () => {
    sig = signTx(tx, privateKey, demo.getScriptPubKey())
    expect(demo.unlock(toHex(sig),  toHex(publicKey))).to.equal(true);
  });

  it('signature check should fail when wrong private key signs', () => {
    sig = signTx(tx, privateKey2, demo.getScriptPubKey())
    expect(demo.unlock(toHex(sig),  toHex(publicKey))).to.equal(false);
  });
});
