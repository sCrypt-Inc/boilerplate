const { expect } = require('chai');
const { buildContractClass } = require('scryptlib');
const { compileContract } = require('../../helper');

describe('Test sCrypt contract dynamicArray In Javascript', () => {
  let array, result

  before(() => {
    const arrayTest = buildContractClass(compileContract('dynamicArrayDemo.scrypt'));
    array = new arrayTest();
  });

  it('should return true', () => {
    result = array.test(0).verify()
    expect(result.success, result.error).to.be.true
  });

});
