const { expect } = require('chai');
const { bsv, buildContractClass, getPreimage, toHex, num2bin, SigHashPreimage } = require('scryptlib');

const {
  inputIndex,
  inputSatoshis,
  newTx,
  DataLen,
  compileContract
} = require('../../helper');

const tx = newTx();
const outputAmount = 222222

describe('Test sCrypt contract Counter In Javascript', () => {
  let counter, preimage, result

  before(() => {
    const Counter = buildContractClass(compileContract('counterRaw.scrypt'))
    counter = new Counter()

    // set initial counter value
    counter.setDataPartInASM(num2bin(0n, DataLen))

    const newLockingScript = [counter.codePart.toASM(), num2bin(1n, DataLen)].join(' ')

    tx.addOutput(new bsv.Transaction.Output({
      script: bsv.Script.fromASM(newLockingScript),
      satoshis: outputAmount
    }))

    preimage = getPreimage(tx, counter.lockingScript, inputSatoshis)

    // set txContext for verification
    counter.txContext = {
      tx,
      inputIndex,
      inputSatoshis
    }
  });

  it('should succeed when pushing right preimage & amount', () => {
    result = counter.increment(SigHashPreimage(toHex(preimage)), BigInt(outputAmount)).verify()
    expect(result.success, result.error).to.be.true
  });

  it('should fail when pushing wrong preimage', () => {
    result = counter.increment(SigHashPreimage(toHex(preimage) + '01'), BigInt(outputAmount)).verify()
    expect(result.success, result.error).to.be.false
  });

  it('should fail when pushing wrong amount', () => {
    result = counter.increment(SigHashPreimage(toHex(preimage)), BigInt(outputAmount - 1)).verify()
    expect(result.success, result.error).to.be.false
  });
});