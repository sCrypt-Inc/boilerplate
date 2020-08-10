const { expect } = require('chai');
const { bsv, buildContractClass, getPreimage, toHex, num2bin, Bytes } = require('scryptlib');

const {
  inputIndex,
  inputSatoshis,
  tx,
  DataLen,
  compileContract
} = require('../../helper');

// make a copy since it will be mutated
const tx_ = bsv.Transaction.shallowCopy(tx)
const outputAmount = 222222

describe('Test sCrypt contract Counter In Javascript', () => {
  let counter, preimage

  before(() => {
    const Counter = buildContractClass(compileContract('counter.scrypt'))
    counter = new Counter()

    // set initial OP_RETURN value
    counter.dataLoad = num2bin(0, DataLen)

    const newLockingScript = counter.codePart.toASM() + ' OP_RETURN ' + num2bin(1, DataLen)

    tx_.addOutput(new bsv.Transaction.Output({
      script: bsv.Script.fromASM(newLockingScript),
      satoshis: outputAmount
    }))

    preimage = getPreimage(tx_, counter.lockingScript.toASM(), inputSatoshis)

    // set txContext for verification
    counter.txContext = {
      tx: tx_,
      inputIndex,
      inputSatoshis
    }
  });

  it('should succeed when pushing right preimage & amount', () => {
    expect(counter.increment(new Bytes(toHex(preimage)), outputAmount).verify()).to.equal(true);
  });

  it('should fail when pushing wrong preimage', () => {
    expect(() => { counter.increment(new Bytes(toHex(preimage) + '01'), outputAmount).verify() }).to.throws(/failed to verify/);
  });

  it('should fail when pushing wrong amount', () => {
    expect(() => { counter.increment(new Bytes(toHex(preimage)), outputAmount - 1).verify() }).to.throws(/failed to verify/);
  });
});