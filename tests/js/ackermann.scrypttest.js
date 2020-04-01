const path = require('path');
const { expect } = require('chai');
const { buildContractClass } = require('scrypttest');

describe('Test sCrypt contract Ackermann In Javascript', () => {
  let ackermann;

  before(() => {
    const Ackermann = buildContractClass(path.join(__dirname, '../../contracts/ackermann.scrypt'));
    ackermann = new Ackermann(2, 1);
  });

  it('should return true', () => {
    expect(ackermann.unlock(5)).to.equal(true);
  });

  it('should return false', () => {
    expect(ackermann.unlock(0)).to.equal(false);
  });
});
