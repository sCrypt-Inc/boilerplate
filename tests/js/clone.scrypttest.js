const { expect } = require('chai');
const { bsv, buildContractClass, Ripemd160, toHex, Bytes, getPreimage, SigHashPreimage, num2bin } = require('scryptlib');

/**
 * an example test for contract containing signature verification
 */
const { compileContract, inputIndex, inputSatoshis, dummyTxId, tx, DataLen } = require('../../helper');

// make a copy since it will be mutated
const tx_ = bsv.Transaction.shallowCopy(tx)
const outputAmount = 222222

describe('Test sCrypt contract Clone In Javascript', () => {
  let clone, preimage, context

  before(() => {

  });

  it('clone should succeed', () => {
    const Clone = buildContractClass(compileContract('clone.scrypt'))
    clone = new Clone()

    const newLockingScript = clone.lockingScript.toASM()

    tx_.addOutput(new bsv.Transaction.Output({
      script: bsv.Script.fromASM(newLockingScript),
      satoshis: inputSatoshis
    }))

    preimage = getPreimage(tx_, clone.lockingScript.toASM(), inputSatoshis)

    context = { tx: tx_, inputSatoshis, inputIndex }

    const unlockFn = clone.unlock(new SigHashPreimage(toHex(preimage)))
    result = unlockFn.verify(context)
    expect(result.success, result.error).to.be.true
  });
});
