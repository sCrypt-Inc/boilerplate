const { expect } = require('chai');
const crypto = require('crypto');
const {
  bsv,
  buildContractClass,
  getPreimage,
  toHex,
  SigHashPreimage,
  num2bin,
  PubKeyHash,
  Bytes,
} = require('scryptlib');

const {
  compileContract,
  inputIndex,
  inputSatoshis,
  newTx  
} = require('../../helper');

// Create a forged transaction which the input of transaction tx does not 
// include this transaction
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

const a = 1n;
const b = 1n;
const c = -2n;
const x = 1n;
describe('Test sCrypt contract Callee in Javascript', () => {
  let callee, caller, preimage, result, newLockingScript;

  before(() => {
    const Callee = buildContractClass(compileContract('callee.scrypt'));
    const Caller = buildContractClass(compileContract('caller.scrypt'));
    callee = new Callee();

    calleeContractTx.addOutput(
      new bsv.Transaction.Output({
        script: callee.lockingScript,
        satoshis: 0,
      })
    );

    caller = new Caller(PubKeyHash(callee.codeHash));


    newLockingScript = bsv.Script.fromASM(['OP_FALSE', 'OP_RETURN', num2bin(a, 2) + num2bin(b, 2) + num2bin(c, 2) + num2bin(x, 2)].join(' '))
    // The first input of tx is the first output point of the transaction calleeContractTx
    tx.addInputFromPrevTx(calleeContractTx)
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

  it('should succeed when callee calls', () => {
    result = caller.call({
      a: a,
      b: b,
      c: c
    },
      Bytes(tx.prevouts()),
      Bytes(calleeContractTx.toString()),
      Bytes(newLockingScript.toHex()),
      BigInt(outputAmount),
      SigHashPreimage(toHex(preimage))).verify();
    expect(result.success, result.error).to.be.true;
  });

  it('should fail with fake calleeContractTx', () => {

    const fakecalleeContractTx = newFakeTx();
    fakecalleeContractTx.addOutput(
      new bsv.Transaction.Output({
        script: callee.lockingScript,
        satoshis: 0,
      })
    );

    result = caller.call({
      a: a,
      b: b,
      c: c
    },
      Bytes(tx.prevouts()),
      Bytes(fakecalleeContractTx.toString()),
      Bytes(newLockingScript.toHex()),
      BigInt(outputAmount),
      SigHashPreimage(toHex(preimage))).verify();
    expect(result.success, result.error).to.be.false;
  });


  it('should fail with fake prevouts', () => {

    const fakeTx = newFakeTx();
    fakeTx.addInputFromPrevTx(calleeContractTx)
    result = caller.call({
      a: a,
      b: b,
      c: c
    },
      Bytes(fakeTx.prevouts()),
      Bytes(calleeContractTx.toString()),
      Bytes(newLockingScript.toHex()),
      BigInt(outputAmount),
      SigHashPreimage(toHex(preimage))).verify();
    expect(result.success, result.error).to.be.false;
  });


  it('should fail with fake newLockingScript', () => {

    const fakeNewLockingScript = bsv.Script.fromASM(['OP_FALSE', 'OP_RETURN', num2bin(a, 2) + num2bin(b, 2) + num2bin(c, 2) + num2bin(x+ 1n, 2)].join(' '))

    result = caller.call({
      a: a,
      b: b,
      c: c
    },
      Bytes(tx.prevouts()),
      Bytes(calleeContractTx.toString()),
      Bytes(fakeNewLockingScript.toHex()),
      BigInt(outputAmount),
      SigHashPreimage(toHex(preimage))).verify();
    expect(result.success, result.error).to.be.false;
  });

});
