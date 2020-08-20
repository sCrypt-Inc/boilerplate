const { expect } = require('chai');
const { buildContractClass } = require('scryptlib');
const { compileContract } = require('../../helper');

describe('Test sCrypt contract Ackermann In Javascript', () => {
  let ackermann, result;

  before(() => {
    const Ackermann = buildContractClass(compileContract('ackermann.scrypt'));
    ackermann = new Ackermann(2, 1);
  });

  it('should return true', () => {
    result = ackermann.unlock(5).verify()
    expect(result.success, result.error).to.be.true
  });

  it('should throw error', () => {
    result = ackermann.unlock(0).verify()
    expect(result.success, result.error).to.be.false
  });
});
