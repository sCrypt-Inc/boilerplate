const { expect } = require('chai');
const { buildContractClass, String } = require('scryptlib');
const { compileContract } = require('../../helper');

describe('Test sCrypt contract HelloWolrd In Javascript', () => {
  let hellowolrd, result;

  before(() => {
    const HelloWolrd = buildContractClass(compileContract('helloworld.scrypt'));
    hellowolrd = new HelloWolrd();
  });

  it('should unlock true', () => {
    result = hellowolrd.unlock(new String("hello world")).verify()
    expect(result.success, result.error).to.be.true
  });

  it('should throw error', () => {
    result = hellowolrd.unlock(new String("hello orld")).verify()
    expect(result.success, result.error).to.be.false
  });
});
