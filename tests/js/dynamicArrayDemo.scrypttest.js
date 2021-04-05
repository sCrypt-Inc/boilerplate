const { expect } = require('chai');
const { buildContractClass } = require('scryptlib');
const { compileContract, loadDesc } = require('../../helper');

describe('Test sCrypt contract dynamicArray In Javascript', () => {
  let demo, result

  before(() => {
    const arrayTest = buildContractClass(loadDesc('dynamicArrayDemo_desc.json'));
    array = new arrayTest();
  });

  it('should return true', () => {
    result = array.test(0).verify()
    expect(result.success, result.error).to.be.true
  });

});
