/**
 * Test for HashPuzzle contract in JavaScript
 **/
const path = require('path');
const { expect } = require('chai');
const { bsv, buildContractClass, toHex, Sha256, Bytes } = require('scryptlib');
const { inputIndex, inputSatoshis, newTx, compileContract } = require('../../helper');

// NIST Test Vectors (https://www.nist.gov/itl/ssd/software-quality-group/nsrl-test-data)
const dataBuffer = Buffer.from("abc");
const data =  dataBuffer
const sha256Data = bsv.crypto.Hash.sha256(dataBuffer);

const tx = newTx();

describe('Test sCrypt contract HashPuzzle In Javascript', () => {
  let hashPuzzle, result

  before(() => {
    HashPuzzle = buildContractClass(compileContract('hashpuzzle.scrypt'))
    hashPuzzle = new HashPuzzle(new Sha256(toHex(sha256Data)))
    //hashPuzzle.txContext = { tx, inputIndex, inputSatoshis }
  });

  it('check should succeed when correct data provided', () => {
    result = hashPuzzle.verify(new Bytes(toHex(data))).verify()
    expect(result.success, result.error).to.be.true
  });

  it('check should fail when wrong data provided', () => {
    result = hashPuzzle.verify(new Bytes(toHex('abcdef'))).verify()
    expect(result.success, result.error).to.be.false
  });

});
