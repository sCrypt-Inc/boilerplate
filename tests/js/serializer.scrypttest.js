const { expect } = require('chai');
const { buildContractClass, Bytes } = require('scryptlib');
const { compileContract } = require('../../helper');

describe('Test sCrypt contract Demo In Javascript', () => {
  let demo, result

  before(() => {
    const Demo = buildContractClass(compileContract('serializer.scrypt'));
    demo = new Demo();
  });

  it('should return true', () => {
    result = demo.main(false, new Bytes('234f'), 3412435).verify()
    expect(result.success, result.error).to.be.true
  });
});
