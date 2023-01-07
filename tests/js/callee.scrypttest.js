const { expect } = require('chai');
const {
  bsv,
  buildContractClass,
  getPreimage,
  toHex,
  SigHashPreimage,
  num2bin,
} = require('scryptlib');

const {
  compileContract,
  inputIndex,
  inputSatoshis,
  newTx,
} = require('../../helper');


const tx = newTx();

const Signature = bsv.crypto.Signature;

const a = 1n;
const b = 1n;
const c = -2n;
const x = 1n;
describe('Test sCrypt contract Callee in Javascript', () => {
  let callee, preimage, result;

  before(() => {
    const Callee = buildContractClass(compileContract('callee.scrypt'));
    callee = new Callee();

    const newLockingScript = ['OP_FALSE', 'OP_RETURN', num2bin(a, 2) + num2bin(b, 2) + num2bin(c, 2)+ num2bin(x, 2)].join(' ')
    tx.addOutput(
      new bsv.Transaction.Output({
        script: bsv.Script.fromASM(newLockingScript),
        satoshis: 0,
      })
    );

    preimage = getPreimage(
      tx,
      callee.lockingScript,
      inputSatoshis,
      0,
      Signature.SINGLE
    );

    // set txContext for verification
    callee.txContext = {
      tx,
      inputIndex,
      inputSatoshis,
    };
  });

  it('should succeed when a,b,c,x  satisfy a * x * x + b * x + c == 0', () => {
    result = callee.solve({
      a: a,
      b: b,
      c: c
    }, x, SigHashPreimage(toHex(preimage))).verify();
    expect(result.success, result.error).to.be.true;
  });

  it('should fail when a,b,c,x  Not satisfy a * x * x + b * x + c == 0', () => {
    result = callee.solve({
      a: a,
      b: b,
      c: c
    }, 2n, SigHashPreimage(toHex(preimage))).verify();
    expect(result.success, result.error).to.be.false;
  });
});
