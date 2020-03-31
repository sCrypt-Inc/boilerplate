const path = require('path');
const { expect } = require('chai');
const { buildContractClass, bsv } = require('scrypttest');

/**
 * an example test for contract using Tx
 */
const { inputIndex, inputSatoshis, tx, getPreimage, toHex } = require('../testHelper');

// make a copy since it will be mutated
const tx_ = bsv.Transaction.shallowCopy(tx)

const outputAmount = 222222

describe('Test sCrypt contract Counter In Javascript', () => {
  let counter
  let lockingScript
  let preimage

  before(() => {
    const Counter = buildContractClass(path.join(__dirname, '../../contracts/counter.scrypt'), tx_, inputIndex, inputSatoshis)
    counter = new Counter()

    lockingScript = counter.getScriptPubKey()
    const newScriptPubKey = lockingScript + ' OP_RETURN 01'
    // append state as passive data
    lockingScript += ' OP_RETURN 00'
    counter.setScriptPubKey(lockingScript)
    
    tx_.addOutput(new bsv.Transaction.Output({
      script: bsv.Script.fromASM(newScriptPubKey),
      satoshis: outputAmount
    }))

    preimage = getPreimage(tx_, lockingScript)
  });

  it('should succeed when pushing right preimage & amount', () => {
    expect(counter.increment(toHex(preimage), outputAmount)).to.equal(true);
  });

  it('should fail when pushing wrong preimage', () => {
    expect(counter.increment(toHex(preimage) + '01', outputAmount)).to.equal(false);
  });

  it('should fail when pushing wrong amount', () => {
    expect(counter.increment(toHex(preimage), outputAmount - 1)).to.equal(false);
  });
});
