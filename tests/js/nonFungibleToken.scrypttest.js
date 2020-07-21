const path = require('path');
const { expect } = require('chai');
const { buildContractClass, bsv } = require('scrypttest');

const { inputIndex, inputSatoshis, tx, signTx, getPreimage, toHex, num2bin, DataLen, dummyTxId } = require('../testHelper');

// make a copy since it will be mutated
let tx_ = bsv.Transaction.shallowCopy(tx)
const outputAmount = 22222
    
describe('Test sCrypt contract Non-Fungible Token In Javascript', () => {
  let token, lockingScriptCodePart

  const privateKey1 = new bsv.PrivateKey.fromRandom('testnet')
  const publicKey1 = bsv.PublicKey.fromPrivateKey(privateKey1)
  const privateKey2 = new bsv.PrivateKey.fromRandom('testnet')
  const publicKey2 = bsv.PublicKey.fromPrivateKey(privateKey2)
  const currTokenId = 42
  const issuer = publicKey1
  const sender = publicKey1
  
  before(() => {
    const Token = buildContractClass(path.join(__dirname, '../../contracts/nonFungibleToken.scrypt'), tx_, inputIndex, inputSatoshis)
    token = new Token()

    // code part
    lockingScriptCodePart = token.getLockingScript()
  });

  it('should succeed when one new token is issued', () => {
    const lockingScript = lockingScriptCodePart + ' OP_RETURN ' + num2bin(currTokenId, DataLen) + toHex(issuer)
    
    const testIssue = (privKey, receiver, newIssuer = issuer, nextTokenId = currTokenId + 1, issuedTokenId = currTokenId) => {
      tx_ = new bsv.Transaction()

      tx_.addInput(new bsv.Transaction.Input({
        prevTxId: dummyTxId,
        outputIndex: 0,
        script: ''
      }), bsv.Script.fromASM(lockingScript), inputSatoshis)

      const newLockingScript0 = lockingScriptCodePart + ' OP_RETURN ' + num2bin(nextTokenId, DataLen) + toHex(newIssuer)
      tx_.addOutput(new bsv.Transaction.Output({
        script: bsv.Script.fromASM(newLockingScript0),
        satoshis: outputAmount
      }))

      const newLockingScript1 = lockingScriptCodePart + ' OP_RETURN ' + num2bin(issuedTokenId, DataLen) + toHex(receiver)
      tx_.addOutput(new bsv.Transaction.Output({
        script: bsv.Script.fromASM(newLockingScript1),
        satoshis: outputAmount
      }))

      const Token = buildContractClass(path.join(__dirname, '../../contracts/nonFungibleToken.scrypt'), tx_, inputIndex, inputSatoshis)
      token = new Token()
      
      token.setLockingScript(lockingScript)
      
      const preimage = getPreimage(tx_, lockingScript, inputIndex)
      const sig = signTx(tx_, privKey, token.getLockingScript())
      return token.issue(toHex(sig), toHex(publicKey2), outputAmount, outputAmount, toHex(preimage))
    }

    expect(testIssue(privateKey1, publicKey2, publicKey1, currTokenId + 1, currTokenId)).to.equal(true);

    // issuer must not change
    expect(testIssue(privateKey1, publicKey2, publicKey2, currTokenId + 1, currTokenId)).to.equal(false);
    
    // unauthorized key
    expect(testIssue(privateKey2, publicKey2, publicKey1, currTokenId + 1, currTokenId)).to.equal(false);
    
    // mismatched next token ID
    expect(testIssue(privateKey1, publicKey2, publicKey1, currTokenId + 2, currTokenId)).to.equal(false);
    
    // mismatched issued token ID
    expect(testIssue(privateKey1, publicKey2, publicKey1, currTokenId + 1, currTokenId - 1)).to.equal(false);
  });

  it('should succeed when a token is transferred', () => {
    const lockingScript = lockingScriptCodePart + ' OP_RETURN ' + num2bin(currTokenId, DataLen) + toHex(sender)
    
    const testTransfer = (privKey, receiver, receivedTokenId = currTokenId) => {
      tx_ = new bsv.Transaction()

      tx_.addInput(new bsv.Transaction.Input({
        prevTxId: dummyTxId,
        outputIndex: 0,
        script: ''
      }), bsv.Script.fromASM(lockingScript), inputSatoshis)

      const newLockingScript0 = lockingScriptCodePart + ' OP_RETURN ' + num2bin(receivedTokenId, DataLen) + toHex(receiver)
      tx_.addOutput(new bsv.Transaction.Output({
        script: bsv.Script.fromASM(newLockingScript0),
        satoshis: outputAmount
      }))

      const Token = buildContractClass(path.join(__dirname, '../../contracts/nonFungibleToken.scrypt'), tx_, inputIndex, inputSatoshis)
      token = new Token()
      
      token.setLockingScript(lockingScript)
      
      const preimage = getPreimage(tx_, lockingScript, inputIndex)
      const sig = signTx(tx_, privKey, token.getLockingScript())
      return token.transfer(toHex(sig), toHex(publicKey2), outputAmount, toHex(preimage))
    }

    expect(testTransfer(privateKey1, publicKey2, currTokenId)).to.equal(true);
    
    // unauthorized key
    expect(testTransfer(privateKey2, publicKey2, currTokenId)).to.equal(false);

    // token ID must not change
    expect(testTransfer(privateKey1, publicKey2, currTokenId + 2)).to.equal(false);
  });
});
