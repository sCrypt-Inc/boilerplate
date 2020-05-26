const path = require('path');
const { expect } = require('chai');
const { buildContractClass, bsv } = require('scrypttest');

/**
 * an example test for contract using TxAdvanced
 */
const { inputIndex, inputSatoshis, tx, getPreimage, toHex } = require('../testHelper');

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
  let lockingScript
  let preimage

  before(() => {
    const Counter = buildContractClass(path.join(__dirname, '../../contracts/advancedCounter.scrypt'), tx_, inputIndex, inputSatoshis)
    counter = new Counter()

    lockingScript = counter.getScriptPubKey()
    const newScriptPubKey = lockingScript + ' OP_RETURN 01'
    // append state as passive data
    lockingScript += ' OP_RETURN 00'
    counter.setScriptPubKey(lockingScript)
    
    // counter output
    tx_.addOutput(new bsv.Transaction.Output({
      script: bsv.Script.fromASM(newScriptPubKey),
      satoshis: outputAmount
    }))

    // change output
    tx_.addOutput(new bsv.Transaction.Output({
      script: bsv.Script.fromASM('OP_DUP OP_HASH160 ' + toHex(pkh) + ' OP_EQUALVERIFY OP_CHECKSIG'),
      satoshis: changeAmount
    }))

    preimage = getPreimage(tx_, lockingScript, sighashType)
  });

  it('should succeed when pushing right preimage & amount', () => {
    expect(counter.increment(toHex(preimage), outputAmount, toHex(pkh), changeAmount)).to.equal(true);
  });
});
