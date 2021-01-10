const { expect } = require('chai');
const { bsv, buildContractClass, Ripemd160, toHex, Bytes, getPreimage, SigHashPreimage, num2bin } = require('scryptlib');

/**
 * an example test for contract containing signature verification
 */
const { compileContract, inputIndex, inputSatoshis, dummyTxId, newTx, DataLen } = require('../../helper');


const tx = newTx();
const outputAmount = 222222

describe('Test sCrypt contract Clone In Javascript', () => {
  let clone, preimage, context

  before(() => {

  });

  it('clone should succeed', () => {
    const Clone = buildContractClass(compileContract('clone.scrypt'))
    clone = new Clone()

    const newLockingScript = clone.lockingScript.toASM()

    tx.addOutput(new bsv.Transaction.Output({
      script: bsv.Script.fromASM(newLockingScript),
      satoshis: inputSatoshis
    }))

    preimage = getPreimage(tx, clone.lockingScript.toASM(), inputSatoshis)

    context = { tx, inputSatoshis, inputIndex }

    const unlockFn = clone.unlock(new SigHashPreimage(toHex(preimage)))
    result = unlockFn.verify(context)
    expect(result.success, result.error).to.be.true
  });
});
