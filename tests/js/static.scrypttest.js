const path = require('path');
const { expect } = require('chai');
const { buildContractClass } = require('scrypttest');

describe('Test sCrypt contract Static In Javascript', () => {
  let static;

  before(() => {
    const Static = buildContractClass(path.join(__dirname, '../../contracts/static.scrypt'));
    static = new Static();
  });

  it('should return true', () => {
    expect(static.equal(32)).to.equal(true);
  });
});
