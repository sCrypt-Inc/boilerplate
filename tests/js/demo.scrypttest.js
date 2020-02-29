const path = require('path');
const { expect } = require('chai');
const { buildContractClass } = require('scrypttest');

describe('Test sCrypt contract Demo In Javascript', () => {
  let demo;

  before(() => {
    const Demo = buildContractClass(path.join(__dirname, '../../contracts/demo.scrypt'));
    demo = new Demo(4, 7);
  });

  it('should return true', () => {
    expect(demo.unlock(4 + 7)).to.equal(true);
  });

  it('should return false', () => {
    expect(demo.unlock(0)).to.equal(false);
  });
});
