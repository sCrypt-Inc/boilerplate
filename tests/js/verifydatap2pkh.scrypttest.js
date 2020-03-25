/**
 * Test for VerifyDataP2PKH contract in JavaScript
 **/
const path = require('path');
const { expect } = require('chai');
const { buildContractClass, bsv } = require('scrypttest');
const { inputIndex, inputSatoshis, tx, signTx, toHex } = require('../testHelper');

// Test keys
const privateKey = new bsv.PrivateKey.fromRandom('testnet')
const publicKey = privateKey.publicKey
const pkh = bsv.crypto.Hash.sha256ripemd160(publicKey.toBuffer())
const privateKey2 = new bsv.PrivateKey.fromRandom('testnet')

// NIST Test Vectors (https://www.nist.gov/itl/ssd/software-quality-group/nsrl-test-data)
const dataBuffer = Buffer.from("abc");
const data =  dataBuffer
const sha256Data = bsv.crypto.Hash.sha256(dataBuffer);

describe('Test sCrypt contract VerifyDataP2PKH In Javascript', () => {
  let demo
  let sig

  before(() => {
    const VerifyDataP2PKH = buildContractClass(path.join(__dirname, '../../contracts/verifydatap2pkh.scrypt'), tx, inputIndex, inputSatoshis)
    demo = new VerifyDataP2PKH(toHex(pkh), toHex(sha256Data))
  });

  it('signature check should succeed when right private key signs', () => {
    sig = signTx(tx, privateKey, demo.getScriptPubKey())
    expect(demo.verify(toHex(data), toHex(sig),  toHex(publicKey))).to.equal(true);
  });

  it('signature check should fail when wrong private key signs', () => {
    sig = signTx(tx, privateKey2, demo.getScriptPubKey())
    expect(demo.verify(toHex(data), toHex(sig),  toHex(publicKey))).to.equal(false);
  });

  it('sha256 check should succeed when right data is provided', () => {
    sig = signTx(tx, privateKey, demo.getScriptPubKey())
    expect(demo.verify(toHex(data), toHex(sig),  toHex(publicKey))).to.equal(true);
  });

  it('sha256 check should fail when wrong data is provided', () => {
    sig = signTx(tx, privateKey, demo.getScriptPubKey())
    expect(demo.verify(toHex("wrong data"), toHex(sig),  toHex(publicKey))).to.equal(false);
  });
});
