const { expect } = require('chai');
const crypto = require('crypto');
const {
  bsv,
  buildContractClass,
  getPreimage,
  toHex,
  SigHashPreimage,
  buildTypeClasses,
  num2bin,
  Ripemd160,
  Bytes,
} = require('scryptlib');

const {
  compileContract,
  inputIndex,
  inputSatoshis,
  newTx,
  createInputFromPrevTx
} = require('../../helper');


function newFakeTx() {
  const utxo = {
    txId: crypto.randomBytes(32).toString('hex'),
    outputIndex: 0,
    script: '',   // placeholder
    satoshis: inputSatoshis
  };
  return new bsv.Transaction().from(utxo);
}


const tx = newTx();
const calleeContractTx = newTx();


const outputAmount = 100000;

const a = 1;
const b = 1;
const c = -2;
const x = 1;
describe('Test sCrypt contract Callee in Javascript', () => {
  let callee, caller, preimage, result, Coeff, newLockingScript;

  before(() => {
    const Callee = buildContractClass(compileContract('callee.scrypt'));
    const Caller = buildContractClass(compileContract('caller.scrypt'));
    Coeff = buildTypeClasses(Callee).Coeff;
    callee = new Callee();

    calleeContractTx.addOutput(
      new bsv.Transaction.Output({
        script: callee.lockingScript,
        satoshis: 0,
      })
    );

    caller = new Caller(new Ripemd160(callee.codeHash));


    newLockingScript = bsv.Script.fromASM(['OP_FALSE', 'OP_RETURN', num2bin(a, 2) + num2bin(b, 2) + num2bin(c, 2) + num2bin(x, 2)].join(' '))
    tx.addInput(createInputFromPrevTx(calleeContractTx))
      .addOutput(
        new bsv.Transaction.Output({
          script: newLockingScript,
          satoshis: outputAmount,
        })
      )


    preimage = getPreimage(
      tx,
      caller.lockingScript,
      inputSatoshis
    );

    // set txContext for verification
    caller.txContext = {
      tx,
      inputIndex,
      inputSatoshis,
    };
  });

  it('should succeed when call callee ', () => {
    result = caller.call(new Coeff({
      a: a,
      b: b,
      c: c
    }),
      new Bytes(tx.prevouts()),
      new Bytes(calleeContractTx.toString()),
      new Bytes(newLockingScript.toHex()),
      outputAmount,
      new SigHashPreimage(toHex(preimage))).verify();
    expect(result.success, result.error).to.be.true;
  });

  it('should fail when with fake calleeContractTx', () => {



    const fakecalleeContractTx = newFakeTx();
    fakecalleeContractTx.addOutput(
      new bsv.Transaction.Output({
        script: callee.lockingScript,
        satoshis: 0,
      })
    );

    result = caller.call(new Coeff({
      a: a,
      b: b,
      c: c
    }),
      new Bytes(tx.prevouts()),
      new Bytes(fakecalleeContractTx.toString()),
      new Bytes(newLockingScript.toHex()),
      outputAmount,
      new SigHashPreimage(toHex(preimage))).verify();
    expect(result.success, result.error).to.be.false;
  });


  it('should fail when with fake prevouts', () => {

    const fakeTx = newFakeTx();
    fakeTx.addInput(createInputFromPrevTx(calleeContractTx))
    result = caller.call(new Coeff({
      a: a,
      b: b,
      c: c
    }),
      new Bytes(fakeTx.prevouts()),
      new Bytes(calleeContractTx.toString()),
      new Bytes(newLockingScript.toHex()),
      outputAmount,
      new SigHashPreimage(toHex(preimage))).verify();
    expect(result.success, result.error).to.be.false;
  });


  it('should fail when with fake newLockingScript', () => {

    const fakeNewLockingScript = bsv.Script.fromASM(['OP_FALSE', 'OP_RETURN', num2bin(a, 2) + num2bin(b, 2) + num2bin(c, 2) + num2bin(x+ 1, 2)].join(' '))

    result = caller.call(new Coeff({
      a: a,
      b: b,
      c: c
    }),
      new Bytes(tx.prevouts()),
      new Bytes(calleeContractTx.toString()),
      new Bytes(fakeNewLockingScript.toHex()),
      outputAmount,
      new SigHashPreimage(toHex(preimage))).verify();
    expect(result.success, result.error).to.be.false;
  });

});
