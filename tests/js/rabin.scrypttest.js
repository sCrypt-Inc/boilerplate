const { expect } = require('chai');
const { buildContractClass, Bytes } = require('scryptlib');
const { compileContract } = require('../../helper');
const { generatePrivKey, privKeyToPubKey, sign } = require('rabinsig');

describe('Test sCrypt contract RabinSignature In Javascript', () => {
  let rabin, result, RabinSignature
  const msg = '00112233445566778899aabbccddeeff'
  
  before(() => {
    RabinSignature = buildContractClass(compileContract('rabinTest.scrypt'));

    rabin = new RabinSignature();
  });

  it('should return true', () => {

    // append "n" for big int
    let key = generatePrivKey();

    let nRabin = privKeyToPubKey(key.p, key.q);

    let result = sign(msg, key.p, key.q, nRabin);


    let paddingBytes = '';

    for(let i = 0; i < result.paddingByteCount; i++) {
      paddingBytes += '00';
    }

    const sig = {
      s: result.signature,
      padding: Bytes(paddingBytes),
    }
    
    result = rabin.main(
        Bytes(msg),
        sig,
        nRabin
      ).verify()
    expect(result.success, result.error).to.be.true
  });


  
  it('should throw error with wrong padding', () => {
    let key = generatePrivKey();

    let nRabin = privKeyToPubKey(key.p, key.q);

    let result = sign(msg, key.p, key.q, nRabin);


    let paddingBytes = '';

    for(let i = 0; i < result.paddingByteCount + 1; i++) {
      paddingBytes += '00';
    }

    const sig = {
      s: result.signature,
      padding: Bytes(paddingBytes + '00'),
    }
    
    result = rabin.main(
      Bytes(msg),
      sig,
      nRabin
    ).verify()
  expect(result.success, result.error).to.be.false
  });

  it('should throw error with wrong signature', () => {

    let key = generatePrivKey();

    let nRabin = privKeyToPubKey(key.p, key.q);

    let result = sign(msg, key.p, key.q, nRabin);


    let paddingBytes = '';

    for(let i = 0; i < result.paddingByteCount; i++) {
      paddingBytes += '00';
    }

    const sig = {
      s: result.signature  + 1n,
      padding: Bytes(paddingBytes),
    }
    result = rabin.main(
      Bytes(msg),
      sig,
      nRabin
    ).verify()
    expect(result.success, result.error).to.be.false
  });

});