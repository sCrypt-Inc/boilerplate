const { expect } = require('chai');
const { buildContractClass, buildTypeClasses, Bytes } = require('scryptlib');
const { compileContract, getRandomInt } = require('../../helper');
const { buildMimc7 } = require('circomlibjs');

describe('Test sCrypt contract MimcTest In Javascript', () => {
  let test, result, mimc7
  
  before(async () => {
    MimcTest = buildContractClass(compileContract('mimcTest.scrypt'))
    test = new MimcTest()
    mimc7 = await buildMimc7()
  });

  it('should get hash result correctly', () => {
    for(let i = 0; i < 10; i++) {
      let x = getRandomInt(-9999999999, 9999999999)
      let k = getRandomInt(1, 9999999999)
      let h = BigInt(mimc7.F.toString(mimc7.hash(x, k)))
      result = test.unlock(x, k, h).verify()
      expect(result.success, result.error).to.be.true
    }
  });

  it('should get multiHash result correctly', () => {
    result = test.unlock1().verify()
    expect(result.success, result.error).to.be.true
  });
  
});