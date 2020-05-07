const path = require('path');
const { expect } = require('chai');
const { buildContractClass } = require('scrypttest');

describe('Test sCrypt contract Demo In Javascript', () => {
  let demo;

  before(() => {
    const Demo = buildContractClass(path.join(__dirname, '../../contracts/demo.scrypt'));
    demo = new Demo(7, 4);
  });

  it('should return true', () => {
    expect(demo.add(7 + 4)).to.equal(true);
    expect(demo.sub(7 - 4)).to.equal(true);
  });

  it('should return false', () => {
    expect(demo.add(0)).to.equal(false);
    expect(demo.sub(1)).to.equal(false);
  });
});
