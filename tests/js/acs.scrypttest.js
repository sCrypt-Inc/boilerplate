const { expect } = require('chai');
const {
  bsv,
  buildContractClass,
  getPreimage,
  PubKeyHash,
  toHex,
  SigHashPreimage,
} = require('scryptlib');

const {
  compileContract,
  inputIndex,
  inputSatoshis,
  newTx,
} = require('../../helper');

const privateKeyX = bsv.PrivateKey.fromRandom('testnet');

const publicKeyX = bsv.PublicKey.fromPrivateKey(privateKeyX);
const pkhX = bsv.crypto.Hash.sha256ripemd160(publicKeyX.toBuffer());
const addressX = privateKeyX.toAddress();

const tx = newTx();

const Signature = bsv.crypto.Signature;

const outputAmount = inputSatoshis - 1000; // minFee

describe('Test sCrypt contract AnyoneCanSpend in Javascript', () => {
  let acs, preimage, result;

  before(() => {
    const AnyoneCanSpend = buildContractClass(compileContract('acs.scrypt'));
    acs = new AnyoneCanSpend(PubKeyHash(toHex(pkhX)));

    tx.addOutput(
      new bsv.Transaction.Output({
        script: bsv.Script.buildPublicKeyHashOut(addressX),
        satoshis: outputAmount,
      })
    );

    preimage = getPreimage(
      tx,
      acs.lockingScript,
      inputSatoshis,
      0,
      Signature.ANYONECANPAY_ALL
    );

    // set txContext for verification
    acs.txContext = {
      tx,
      inputIndex,
      inputSatoshis,
    };
  });

  it('should succeed when pushing right preimage', () => {
    result = acs.unlock(SigHashPreimage(toHex(preimage)), BigInt(outputAmount)).verify();
    expect(result.success, result.error).to.be.true;
  });

  it('should fail when pushing wrong preimage', () => {
    result = acs.unlock(SigHashPreimage(toHex(preimage) + '01'), BigInt(outputAmount)).verify();
    expect(result.success, result.error).to.be.false;
  });
});
