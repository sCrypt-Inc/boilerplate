const { expect } = require('chai');
const { buildContractClass } = require('scryptlib');
const { compileContract } = require('../../helper');

describe('Test sCrypt contract Ackermann In Javascript', () => {
  let ackermann;

  before(() => {
    const Ackermann = buildContractClass(compileContract('ackermann.scrypt'));
    ackermann = new Ackermann(2, 1);
  });

  it('should return true', () => {
    expect(ackermann.unlock(5).verify()).to.equal(true);
  });

  it('should throw error', () => {
    expect(() => { ackermann.unlock(0).verify() }).to.throws(/failed to verify/);
  });
});
