const { expect } = require('chai');
const { buildContractClass, Bytes, toHex } = require('scryptlib');
const { compileContract } = require('../../helper');

// input script: OP_2 OP_5 OP_ADD OP_6 OP_ADD OP_7 OP_ADD OP_16 OP_SUB OP_3 OP_ADD OP_4 OP_ADD OP_8 OP_SUB
const inputScript = '525593569357936094539354935894';

describe('Test sCrypt contract SimpleBVM in Javascript', () => {
  let simpleBVM, result;

  before(() => {
    const SimpleBVM = buildContractClass(compileContract('simpleBVM.scrypt'));
    simpleBVM = new SimpleBVM(3);
  });

  it('should succeed when pushing right input script', () => {
    result = simpleBVM.unlock(new Bytes(toHex(inputScript))).verify();
    expect(result.success, result.error).to.be.true;
  });

  it('should fail when pushing wrong  input script', () => {
    result = simpleBVM.unlock(new Bytes(toHex(inputScript + '52'))).verify();
    expect(result.success, result.error).to.be.false;
  });
});
