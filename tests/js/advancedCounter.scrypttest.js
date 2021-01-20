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
const sighashType = Signature.SIGHASH_ANYONECANPAY | Signature.SIGHASH_ALL | Signature.SIGHASH_FORKID
const outputAmount = 222222
const changeAmount = 111111

describe('Test sCrypt contract Counter In Javascript', () => {
  let counter, preimage, result

  before(() => {
    const Counter = buildContractClass(compileContract('advancedCounter.scrypt'))
    counter = new Counter()

    // append state as passive data
    counter.setDataPart(num2bin(0, DataLen))

    const newLockingScript = [counter.codePart.toASM(), num2bin(1, DataLen)].join(' ')
    // counter output
    tx.addOutput(new bsv.Transaction.Output({
      script: bsv.Script.fromASM(newLockingScript),
      satoshis: outputAmount
    }))

    // change output
    tx.addOutput(new bsv.Transaction.Output({
      script: bsv.Script.buildPublicKeyHashOut(privateKey.toAddress()),
      satoshis: changeAmount
    }))

    preimage = getPreimage(tx, counter.lockingScript.toASM(), inputSatoshis, 0, sighashType)
  });

  it('should succeed when pushing right preimage & amount', () => {
    // any contract that includes checkSig() must be verified in a given context
    const context = { tx, inputIndex, inputSatoshis }
    result = counter.increment(new SigHashPreimage(toHex(preimage)), outputAmount, new Ripemd160(toHex(pkh)), changeAmount).verify(context)
    expect(result.success, result.error).to.be.true;
  });
});
