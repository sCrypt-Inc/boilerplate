const { expect } = require('chai');
const { bsv, buildContractClass, getPreimage, toHex, num2bin, SigHashPreimage, Ripemd160 } = require('scryptlib');
const {
  inputIndex,
  inputSatoshis,
  newTx,
  DataLen,
  compileContract
} = require('../../helper');

const tx = newTx();

// Test keys
const privateKey = new bsv.PrivateKey.fromRandom('testnet')
const publicKey = privateKey.publicKey
const pkh = bsv.crypto.Hash.sha256ripemd160(publicKey.toBuffer())

const Signature = bsv.crypto.Signature
// Note: ANYONECANPAY
const sighashType = Signature.SIGHASH_ANYONECANPAY | Signature.SIGHASH_SINGLE | Signature.SIGHASH_FORKID
const changeAmount = 111111

describe('Test sCrypt contract Counter In Javascript', () => {
  let counter, preimage, result

  before(() => {
    const AdvancedCounter = buildContractClass(compileContract('advancedCounter.scrypt'))
    counter = new AdvancedCounter(0)


    const newLockingScript = counter.getStateScript({counter: 1})
    // counter output
    tx.addOutput(new bsv.Transaction.Output({
      script: newLockingScript,
      satoshis: inputSatoshis
    }))


    preimage = getPreimage(tx, counter.lockingScript, inputSatoshis, 0, sighashType)
  });

  it('should succeed when pushing right preimage & amount', () => {
    // any contract that includes checkSig() must be verified in a given context
    const context = { tx, inputIndex, inputSatoshis }
    result = counter.increment(new SigHashPreimage(toHex(preimage))).verify(context)
    expect(result.success, result.error).to.be.true;
  });


  it('should succeed when add change output', () => {
    // change output
    tx.addOutput(new bsv.Transaction.Output({
      script: bsv.Script.buildPublicKeyHashOut(privateKey.toAddress()),
      satoshis: changeAmount
    }))


    // any contract that includes checkSig() must be verified in a given context
    const context = { tx, inputIndex, inputSatoshis }
    result = counter.increment(new SigHashPreimage(toHex(preimage))).verify(context)
    expect(result.success, result.error).to.be.true;
  });


});
