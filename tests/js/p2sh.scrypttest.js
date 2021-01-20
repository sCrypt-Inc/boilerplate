const { expect } = require('chai');
const { bsv, buildContractClass, Ripemd160, toHex, Bytes, getPreimage, SigHashPreimage } = require('scryptlib');

/**
 * an example test for contract containing signature verification
 */
const { compileContract, inputIndex, inputSatoshis, dummyTxId, newTx } = require('../../helper');

const tx = newTx();
describe('Test sCrypt contract P2SH In Javascript', () => {
  let demoContract, p2sh, preimage, context

  before(() => {
    const P2SH = buildContractClass(compileContract('p2sh.scrypt'))
    const DemoContract = buildContractClass(compileContract('counter.scrypt'))

    demoContract = new DemoContract()

    const codeScript = demoContract.codePart.toBuffer()
    const scriptHash = bsv.crypto.Hash.sha256ripemd160( codeScript )

    p2sh = new P2SH(new Ripemd160(toHex(scriptHash)))


    tx.addInput(new bsv.Transaction.Input({
      prevTxId: dummyTxId,
      outputIndex: inputIndex,
      script: ''
    }), bsv.Script.fromASM(p2sh.lockingScript.toASM()), inputSatoshis)

    tx.addOutput(new bsv.Transaction.Output({
      script: demoContract.codePart,
      satoshis: inputSatoshis
    }))

    context = { tx, inputIndex, inputSatoshis }
  });

  it('redeem should succeed', () => {
    preimage = getPreimage(tx, p2sh.lockingScript.toASM(), inputSatoshis, 0)
    // expect(toHex( p2sh.lockingScript.toBuffer())).is.eql(preimage.scriptCode)

    const codeScript = demoContract.codePart.toBuffer()
    const redeemFn = p2sh.redeem(new Bytes(toHex(codeScript)), new SigHashPreimage(toHex(preimage)))
    result = redeemFn.verify(context)
    expect(result.success, result.error).to.be.true
  });
});
