const { expect } = require('chai');
const {
  bsv,
  buildContractClass,
  getPreimage,
  Ripemd160,
  toHex,
  SigHashPreimage,
} = require('scryptlib');

const {
  compileContract,
  inputIndex,
  inputSatoshis,
  newTx,
} = require('../../helper');

// Demo values for testing
const pkhX = 'f5af74378a5faaff242f47490fd225868586f6b2';
const addressX = 'n3v22oq3CpnCZnVYFcXP6GUaXt7Ts2TCTj';

const tx = newTx();

const Signature = bsv.crypto.Signature;
// Note: ANYONECANPAY
const sighashType =
  Signature.SIGHASH_ANYONECANPAY |
  Signature.SIGHASH_ALL |
  Signature.SIGHASH_FORKID;

const outputAmount = inputSatoshis - 546; // minFee

describe('Test sCrypt contract AnyoneCanSpend in Javascript', () => {
  let acs, preimage, result;

  before(() => {
    const AnyoneCanSpend = buildContractClass(compileContract('acs.scrypt'));
    acs = new AnyoneCanSpend(new Ripemd160(toHex(pkhX)));

    tx.addOutput(
      new bsv.Transaction.Output({
        script: bsv.Script.buildPublicKeyHashOut(addressX),
        satoshis: outputAmount,
      })
    );

    preimage = getPreimage(
      tx,
      acs.lockingScript.toASM(),
      inputSatoshis,
      0,
      sighashType
    );

    // set txContext for verification
    acs.txContext = {
      tx,
      inputIndex,
      inputSatoshis,
    };
  });

  it('should succeed when pushing right preimage', () => {
    result = acs.unlock(new SigHashPreimage(toHex(preimage))).verify();
    expect(result.success, result.error).to.be.true;
  });

  it('should fail when pushing wrong preimage', () => {
    result = acs.unlock(new SigHashPreimage(toHex(preimage) + '01')).verify();
    expect(result.success, result.error).to.be.false;
  });
});
