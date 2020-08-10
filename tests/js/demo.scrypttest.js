const { expect } = require('chai');
const { buildContractClass } = require('scryptlib');
const { compileContract } = require('../../helper');

describe('Test sCrypt contract Demo In Javascript', () => {
  let demo;

  before(() => {
    const Demo = buildContractClass(compileContract('demo.scrypt'));
    demo = new Demo(7, 4);
  });

  it('should return true', () => {
    expect(demo.add(7 + 4).verify()).to.equal(true);
    expect(demo.sub(7 - 4).verify()).to.equal(true);
  });

  it('should throw error', () => {
    expect(() => { demo.add(0).verify() }).to.throws(/failed to verify/);
    expect(() => { demo.sub(1).verify() }).to.throws(/failed to verify/);
  });
});
