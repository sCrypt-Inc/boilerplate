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

describe('Test sCrypt contract HashPuzzleP2PKH In Javascript', () => {
  let hashPuzzleP2PKH
  let sig

  before(() => {
    const HashPuzzleP2PKH = buildContractClass(path.join(__dirname, '../../contracts/hashpuzzlep2pkh.scrypt'), tx, inputIndex, inputSatoshis)
    hashPuzzleP2PKH = new HashPuzzleP2PKH(toHex(pkh), toHex(sha256Data))
  });

  it('signature check should succeed when correct private key signs & correct data provided', () => {
    sig = signTx(tx, privateKey, hashPuzzleP2PKH.getLockingScript())
    expect(hashPuzzleP2PKH.verify(toHex(data), toHex(sig), toHex(publicKey))).to.equal(true);
  });

  it('signature check should fail when correct private key signs & wrong data provided', () => {
    sig = signTx(tx, privateKey, hashPuzzleP2PKH.getLockingScript())
    expect(hashPuzzleP2PKH.verify(toHex('wrong data'), toHex(sig), toHex(publicKey))).to.equal(false);
  });

  it('signature check should fail when wrong private key signs & correct data provided', () => {
    sig = signTx(tx, privateKey2, hashPuzzleP2PKH.getLockingScript())
    expect(hashPuzzleP2PKH.verify(toHex(data), toHex(sig), toHex(publicKey))).to.equal(false);
  });

  it('signature check should fail when wrong private key signs & wrong data provided', () => {
    sig = signTx(tx, privateKey2, hashPuzzleP2PKH.getLockingScript())
    expect(hashPuzzleP2PKH.verify(toHex('wrong data'), toHex(sig), toHex(publicKey))).to.equal(false);
  });

});
