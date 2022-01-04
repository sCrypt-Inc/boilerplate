const { expect } = require('chai');
const { buildContractClass } = require('scryptlib');
const { compileContract } = require('../../helper');

describe('Test sCrypt contract HashMap In Javascript', () => {
  let hashMapTest, result

  before(() => {
    const HashMapTest = buildContractClass(compileContract('hashmapTest.scrypt'));
    hashMapTest = new HashMapTest();
  });

  it('test hashMapTest', () => {
    result = hashMapTest.test(102).verify();
    expect(result.success, result.error).to.be.true
  });

  it('test hashMapTest testUpdate', () => {
    result = hashMapTest.testUpdate(1).verify();
    expect(result.success, result.error).to.be.true
  });

  it('test hashMapTest testCollision', () => {

    result = hashMapTest.testCollision(1).verify();
    expect(result.success, result.error).to.be.false
  });

});
