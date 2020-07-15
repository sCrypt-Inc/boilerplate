const path = require('path');
const { expect } = require('chai');
const { buildContractClass, bsv } = require('scrypttest');

const { inputIndex, inputSatoshis, tx, getPreimage, toHex, num2bin, ByteLen } = require('../testHelper');

// make a copy since it will be mutated
const tx_ = bsv.Transaction.shallowCopy(tx)

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
  let counter
  let preimage

  before(() => {
    const Counter = buildContractClass(path.join(__dirname, '../../contracts/advancedCounter.scrypt'), tx_, inputIndex, inputSatoshis)
    counter = new Counter()

    lockingScriptCodePart = counter.getLockingScript()
    // append state as passive data
    const lockingScript = lockingScriptCodePart + ' OP_RETURN ' + num2bin(0, ByteLen)
    counter.setLockingScript(lockingScript)
    const newLockingScript = lockingScriptCodePart + ' OP_RETURN ' + num2bin(1, ByteLen)
    
    // counter output
    tx_.addOutput(new bsv.Transaction.Output({
      script: bsv.Script.fromASM(newLockingScript),
      satoshis: outputAmount
    }))

    // change output
    tx_.addOutput(new bsv.Transaction.Output({
      script: bsv.Script.fromASM('OP_DUP OP_HASH160 ' + toHex(pkh) + ' OP_EQUALVERIFY OP_CHECKSIG'),
      satoshis: changeAmount
    }))

    preimage = getPreimage(tx_, lockingScript, 0, inputSatoshis, sighashType)
  });

  it('should succeed when pushing right preimage & amount', () => {
    expect(counter.increment(toHex(preimage), outputAmount, toHex(pkh), changeAmount)).to.equal(true);
  });
});
