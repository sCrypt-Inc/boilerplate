const { expect } = require('chai');
const { bsv, buildContractClass, getPreimage, toHex, num2bin, SigHashPreimage, Bytes } = require('scryptlib');

const {
  inputIndex,
  inputSatoshis,
  newTx,
  DataLen,
  compileContract
} = require('../../helper');


const outputAmount = 222222

describe('Test sCrypt contract Outputs In Javascript', () => {
  let outputs, preimage, result

  before(() => {
    const Outputs = buildContractClass(compileContract('outputs.scrypt'))
    outputs = new Outputs()

  });

  it('should succeed if add 2 output', () => {

    const tx = newTx();
    tx.addOutput(new bsv.Transaction.Output({
      script: bsv.Script.fromASM("OP_1"),
      satoshis: outputAmount
    }))

    tx.addOutput(new bsv.Transaction.Output({
      script: bsv.Script.fromASM("OP_1"),
      satoshis: outputAmount
    }))

    preimage = getPreimage(tx, outputs.lockingScript, inputSatoshis)

    // set txContext for verification
    outputs.txContext = {
      tx,
      inputIndex,
      inputSatoshis
    }

    let output1 = bsv.Script.fromASM("OP_1").toHex();

    result = outputs.unlock(new SigHashPreimage(toHex(preimage)), [new Bytes(output1), new Bytes(output1)], [outputAmount, outputAmount]).verify()
    expect(result.success, result.error).to.be.true
  });

  it('should fail if not add 2 output', () => {
    let output1 = bsv.Script.fromASM("OP_1").toHex();

    const tx = newTx();
    tx.addOutput(new bsv.Transaction.Output({
      script: bsv.Script.fromASM("OP_1"),
      satoshis: outputAmount
    }))

    preimage = getPreimage(tx, outputs.lockingScript, inputSatoshis)

    // set txContext for verification
    outputs.txContext = {
      tx,
      inputIndex,
      inputSatoshis
    }

    result = outputs.unlock(new SigHashPreimage(toHex(preimage)), [new Bytes(output1), new Bytes(output1)], [outputAmount, outputAmount]).verify()
    expect(result.success, result.error).to.be.false
  });

});