const { expect } = require('chai');
const { buildContractClass, stringToBytes } = require('scryptlib');
const { compileContract } = require('../../helper');

describe('Test sCrypt contract HelloWolrd In Javascript', () => {
  let hellowolrd, result;

  before(() => {
    const HelloWolrd = buildContractClass(compileContract('helloworld.scrypt'));
    hellowolrd = new HelloWolrd();
  });

  it('should unlock true', () => {
    result = hellowolrd.unlock(stringToBytes("hello world")).verify()
    expect(result.success, result.error).to.be.true
  });

  it('should throw error', () => {
    result = hellowolrd.unlock(stringToBytes("hello orld")).verify()
    expect(result.success, result.error).to.be.false
  });
});
