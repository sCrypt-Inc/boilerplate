const { expect } = require('chai');
const { buildContractClass, Bytes } = require('scryptlib');
const { compileContract } = require('../../helper');
const { generatePrivKey, privKeyToPubKey, sign } = require('rabinsig');
describe('Test sCrypt contract RabinSignature In Javascript', () => {
  let rabin, result

  before(() => {
    const RabinSignature = buildContractClass(compileContract('rabin.scrypt'));
    rabin = new RabinSignature();
  });

  it('should return true', () => {
    // append "n" for big int
    let key = generatePrivKey();

    let nRabin = privKeyToPubKey(key.p, key.q);

    let result = sign("00112233445566778899aabbccddeeff", key.p, key.q, nRabin);


    let paddingBytes = '';

    for(let i = 0; i < result.paddingByteCount; i++) {
      paddingBytes += '00';
    }

    result = rabin.verifySig(
        result.signature, 
        new Bytes('00112233445566778899aabbccddeeff'),
        new Bytes(paddingBytes),
        nRabin
      ).verify()
    expect(result.success, result.error).to.be.true
  });


  
  it('should throw error with wrong padding', () => {

    let key = generatePrivKey();

    let nRabin = privKeyToPubKey(key.p, key.q);

    let result = sign("00112233445566778899aabbccddeeff", key.p, key.q, nRabin);


    let paddingBytes = '';

    for(let i = 0; i < result.paddingByteCount + 1; i++) {
      paddingBytes += '00';
    }

    
    result = rabin.verifySig(
      result.signature, 
      new Bytes('00112233445566778899aabbccddeeff'),
      new Bytes(paddingBytes),
      nRabin
    ).verify()
  expect(result.success, result.error).to.be.false
  });

  it('should throw error with wrong signature', () => {
    let key = generatePrivKey();

    let nRabin = privKeyToPubKey(key.p, key.q);

    let result = sign("00112233445566778899aabbccddeeff", key.p, key.q, nRabin);


    let paddingBytes = '';

    for(let i = 0; i < result.paddingByteCount; i++) {
      paddingBytes += '00';
    }

    result = rabin.verifySig(
        result.signature + 1n, 
        new Bytes('00112233445566778899aabbccddeeff'),
        new Bytes(paddingBytes),
        nRabin
      ).verify()
    expect(result.success, result.error).to.be.false
  });

});