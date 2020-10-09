const { expect } = require('chai');
const { bsv, buildContractClass, getPreimage, toHex, num2bin, SigHashPreimage } = require('scryptlib');

const {
  inputIndex,
  inputSatoshis,
  tx,
  DataLen,
  compileContract
} = require('../../helper');

// TODO: to be moved to scryptlib
const BN = bsv.crypto.BN
function pack(n) {
  const num = BN.fromNumber(n);
  return num.toSM({ endian: 'little' }).toString('hex');
}

function serialize(data) {
  return pack(data)
}

// make a copy since it will be mutated
const tx_ = bsv.Transaction.shallowCopy(tx)
const outputAmount = 222222

describe('Test sCrypt contract Counter In Javascript', () => {
  let counter, preimage, result

  before(() => {
    const Counter = buildContractClass(compileContract('counter.scrypt'))
    counter = new Counter()

    // set initial OP_RETURN value
    counter.dataLoad = [6, 4].map(x => serialize(x)).join(' ')

    const newLockingScript = counter.codePart.toASM() + ' OP_RETURN ' + [7, 4].map(x => serialize(x)).join(' ')

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
    result = counter.increment(new SigHashPreimage(toHex(preimage)), outputAmount).verify()
    expect(result.success, result.error).to.be.true
  });

  it('should fail when pushing wrong preimage', () => {
    result = counter.increment(new SigHashPreimage(toHex(preimage) + '01'), outputAmount).verify()
    expect(result.success, result.error).to.be.false
  });

  it('should fail when pushing wrong amount', () => {
    result = counter.increment(new SigHashPreimage(toHex(preimage)), outputAmount - 1).verify()
    expect(result.success, result.error).to.be.false
  });
});