const path = require('path');
const { expect } = require('chai');
const { buildContractClass } = require('scrypttest');

describe('Test sCrypt contract VarShadow In Javascript', () => {
  let demo;

  before(() => {
    const Demo = buildContractClass(path.join(__dirname, '../../contracts/varshadow.scrypt'));
    demo = new Demo();
  });

  it('should return true', () => {
    expect(demo.unlock(5)).to.equal(true);
  });
});
