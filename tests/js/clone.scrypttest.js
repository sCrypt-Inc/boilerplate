const { expect } = require('chai');
const { bsv, buildContractClass, getPreimage } = require('scryptlib');

/**
 * an example test for contract containing signature verification
 */
const { compileContract, inputIndex, inputSatoshis, newTx } = require('../../helper');


const tx = newTx();

describe('Test sCrypt contract Clone In Javascript', () => {
  let clone, preimage, context

  before(() => {
    const Clone = buildContractClass(compileContract('clone.scrypt'))
    clone = new Clone()
  });

  it('clone should succeed', () => {

    const newLockingScript = clone.lockingScript.toASM()

    tx.addOutput(new bsv.Transaction.Output({
      script: bsv.Script.fromASM(newLockingScript),
      satoshis: inputSatoshis
    }))

    preimage = getPreimage(tx, clone.lockingScript, inputSatoshis)

    context = { tx, inputSatoshis, inputIndex }

    const unlockFn = clone.unlock(preimage)
    result = unlockFn.verify(context)
    expect(result.success, result.error).to.be.true
  });
});
