const { expect } = require('chai');
const { buildContractClass } = require('scryptlib');
const { compileContract } = require('../../helper');

describe('Test sCrypt contract Demo In Javascript', () => {
  let demo, result

  before(() => {
    const Demo = buildContractClass(compileContract('demo.scrypt'));
    demo = new Demo(7, 4);
  });

  it('should return true', () => {
    result = demo.add(7 + 4).verify()
    expect(result.success, result.error).to.be.true
    result = demo.sub(7 - 4).verify()
    expect(result.success, result.error).to.be.true
  });

  it('should throw error', () => {
    result = demo.add(0).verify()
    expect(result.success, result.error).to.be.false
    result = demo.sub(1).verify()
    expect(result.success, result.error).to.be.false
  });
});
