const { expect } = require('chai');
const {
  bsv,
  buildContractClass,
  getPreimage,
  toHex,
  SigHashPreimage,
  buildTypeClasses,
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

const sighashType =  Signature.SIGHASH_SINGLE | Signature.SIGHASH_FORKID;

const a = 1;
const b = 1;
const c = -2;
const x = 1;
describe('Test sCrypt contract Callee in Javascript', () => {
  let callee, preimage, result, Coeff;

  before(() => {
    const Callee = buildContractClass(compileContract('callee.scrypt'));
    Coeff = buildTypeClasses(Callee).Coeff;
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
      sighashType
    );

    // set txContext for verification
    callee.txContext = {
      tx,
      inputIndex,
      inputSatoshis,
    };
  });

  it('should succeed when a,b,c,x  satisfy a * x * x + b * x + c == 0', () => {
    result = callee.solve(new Coeff({
      a: a,
      b: b,
      c: c
    }), x, new SigHashPreimage(toHex(preimage))).verify();
    expect(result.success, result.error).to.be.true;
  });

  it('should fail when a,b,c,x  Not satisfy a * x * x + b * x + c == 0', () => {
    result = callee.solve(new Coeff({
      a: a,
      b: b,
      c: c
    }), 2, new SigHashPreimage(toHex(preimage))).verify();
    expect(result.success, result.error).to.be.false;
  });
});
