const path = require('path');
const { expect } = require('chai');
const { buildContractClass, bsv } = require('scrypttest');

const { inputIndex, inputSatoshis, tx, signTx, getPreimage, toHex } = require('../testHelper');

const outputAmount = 222222

describe('Test sCrypt contract Token In Javascript', () => {
  let token
  let getPreimageAfterTransfer

  const privateKey1 = new bsv.PrivateKey.fromWIF('cVz3fxUcZNgDfJRtNvMRPDebqTSmfx8L134c9y6a6g81nT58p8kQ')
  const publicKey1 = bsv.PublicKey.fromPrivateKey(privateKey1)
  const privateKey2 = new bsv.PrivateKey.fromWIF('cUWWx7J1V9xmUYqM1vjNk99dri9BijzJK1FwAVjFHDQGR7n9hHyG')
  const publicKey2 = bsv.PublicKey.fromPrivateKey(privateKey2)
  
  before(() => {
    const Token = buildContractClass(path.join(__dirname, '../../contracts/token.scrypt'), tx, inputIndex, inputSatoshis)
    token = new Token()

    // code part
    const lockingScriptCode = token.getScriptPubKey()
    
    // initial supply 100 tokens: publicKey1 has 100, publicKey2 0
    const lockingScript = lockingScriptCode + ' OP_RETURN ' + publicKey1.toHex() + num2SM(100) + publicKey2.toHex() + '00'
    token.setScriptPubKey(lockingScript)
    
    getPreimageAfterTransfer = (balance1, balance2) => {
      const newScriptPubKey = lockingScriptCode + ' OP_RETURN ' + publicKey1.toHex() + num2SM(balance1) + publicKey2.toHex() + num2SM(balance2)
      tx.addOutput(new bsv.Transaction.Output({
        script: bsv.Script.fromASM(newScriptPubKey),
        satoshis: outputAmount
      }))

      return getPreimage(tx, lockingScript)
    }
  });

  it('should succeed when publicKey1 transfers 40 tokens to publicKey2', () => {
    // after transfer 40 tokens: publicKey1 has 60, publicKey2 40
    const preimage = getPreimageAfterTransfer(60, 40)
    const sig1 = signTx(tx, privateKey1, token.getScriptPubKey())
    expect(token.transfer('0x' + publicKey1.toHex(), toHex(sig1), '0x' + publicKey2.toHex(), 40, toHex(preimage), outputAmount)).to.equal(true);
  });

  it('should fail due to wrong balances', () => {
    // after transfer 40 tokens: publicKey1 has 60, publicKey2 40
    const preimage = getPreimageAfterTransfer(60, 30)
    const sig1 = signTx(tx, privateKey1, token.getScriptPubKey())
    expect(token.transfer('0x' + publicKey1.toHex(), toHex(sig1), '0x' + publicKey2.toHex(), 40, toHex(preimage), outputAmount)).to.equal(false);
  });

  it('should fail when publicKey2 transfers 40 tokens to publicKey1 due to insufficient balance', () => {
    const preimage = getPreimageAfterTransfer(60, 40)
    const sig2 = signTx(tx, privateKey2, token.getScriptPubKey())
    expect(token.transfer('0x' + publicKey2.toHex(), toHex(sig2), '0x' + publicKey1.toHex(), 40, toHex(preimage), outputAmount)).to.equal(false);
  });

  it('should fail when publicKey1 transfers 40 tokens to publicKey2 due to wrong signature', () => {
    const preimage = getPreimageAfterTransfer(60, 40)
    const sig2 = signTx(tx, privateKey2, token.getScriptPubKey())
    expect(token.transfer('0x' + publicKey1.toHex(), toHex(sig2), '0x' + publicKey2.toHex(), 40, toHex(preimage), outputAmount)).to.equal(false);
  });
});
