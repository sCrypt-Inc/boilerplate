const path = require('path');
const { expect } = require('chai');
const { buildContractClass, bsv, int2Asm } = require('scrypttest');

const { inputIndex, inputSatoshis, tx, signTx, getPreimage, toHex } = require('../testHelper');

// make a copy since it will be mutated
const tx_ = bsv.Transaction.shallowCopy(tx)

const outputAmount = 222222

describe('Test sCrypt contract Token In Javascript', () => {
  let token
  let getPreimageAfterTransfer

  const privateKey1 = new bsv.PrivateKey.fromRandom('testnet')
  const publicKey1 = bsv.PublicKey.fromPrivateKey(privateKey1)
  const privateKey2 = new bsv.PrivateKey.fromRandom('testnet')
  const publicKey2 = bsv.PublicKey.fromPrivateKey(privateKey2)
  
  before(() => {
    const Token = buildContractClass(path.join(__dirname, '../../contracts/token.scrypt'), tx_, inputIndex, inputSatoshis)
    token = new Token()

    // code part
    const lockingScriptCode = token.getScriptPubKey()
    
    // initial supply 100 tokens: publicKey1 has 100, publicKey2 0
    const lockingScript = lockingScriptCode + ' OP_RETURN ' + toHex(publicKey1) + int2Asm(100) + toHex(publicKey2) + '00'
    token.setScriptPubKey(lockingScript)
    
    getPreimageAfterTransfer = (balance1, balance2) => {
      const newScriptPubKey = lockingScriptCode + ' OP_RETURN ' + toHex(publicKey1) + int2Asm(balance1) + toHex(publicKey2) + int2Asm(balance2)
      tx_.addOutput(new bsv.Transaction.Output({
        script: bsv.Script.fromASM(newScriptPubKey),
        satoshis: outputAmount
      }))

      return getPreimage(tx_, lockingScript)
    }
  });

  it('should succeed when publicKey1 transfers 40 tokens to publicKey2', () => {
    // after transfer 40 tokens: publicKey1 has 60, publicKey2 40
    const preimage = getPreimageAfterTransfer(60, 40)
    const sig1 = signTx(tx_, privateKey1, token.getScriptPubKey())
    expect(token.transfer(toHex(publicKey1), toHex(sig1), toHex(publicKey2), 40, toHex(preimage), outputAmount)).to.equal(true);
  });

  it('should fail due to wrong balances', () => {
    // after transfer 40 tokens: publicKey1 has 60, publicKey2 40
    const preimage = getPreimageAfterTransfer(60, 30)
    const sig1 = signTx(tx_, privateKey1, token.getScriptPubKey())
    expect(token.transfer(toHex(publicKey1), toHex(sig1), toHex(publicKey2), 40, toHex(preimage), outputAmount)).to.equal(false);
  });

  it('should fail when publicKey2 transfers 40 tokens to publicKey1 due to insufficient balance', () => {
    const preimage = getPreimageAfterTransfer(60, 40)
    const sig2 = signTx(tx_, privateKey2, token.getScriptPubKey())
    expect(token.transfer(toHex(publicKey2), toHex(sig2), toHex(publicKey1), 40, toHex(preimage), outputAmount)).to.equal(false);
  });

  it('should fail when publicKey1 transfers 40 tokens to publicKey2 due to wrong signature', () => {
    const preimage = getPreimageAfterTransfer(60, 40)
    const sig2 = signTx(tx_, privateKey2, token.getScriptPubKey())
    expect(token.transfer(toHex(publicKey1), toHex(sig2), toHex(publicKey2), 40, toHex(preimage), outputAmount)).to.equal(false);
  });
});
