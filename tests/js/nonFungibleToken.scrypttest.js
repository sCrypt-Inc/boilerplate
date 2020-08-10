const { expect } = require('chai');
const { bsv, buildContractClass, signTx, toHex, getPreimage, num2bin, PubKey, Bytes, Sig } = require('scryptlib');
const { inputIndex, inputSatoshis, tx, compileContract, DataLen, dummyTxId } = require('../../helper');

// make a copy since it will be mutated
var tx_ = bsv.Transaction.shallowCopy(tx)
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
    const Token = buildContractClass(compileContract('nonFungibleToken.scrypt'))
    token = new Token()

    // code part
    lockingScriptCodePart = token.codePart.toASM()
  });

  it('should succeed when one new token is issued', () => {
    token.dataLoad = num2bin(currTokenId, DataLen) + toHex(issuer)
    
    const testIssue = (privKey, receiver, newIssuer = issuer, nextTokenId = currTokenId + 1, issuedTokenId = currTokenId) => {
      tx_ = new bsv.Transaction()

      tx_.addInput(new bsv.Transaction.Input({
        prevTxId: dummyTxId,
        outputIndex: 0,
        script: ''
      }), bsv.Script.fromASM(token.lockingScript.toASM()), inputSatoshis)

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

      const preimage = getPreimage(tx_, token.lockingScript.toASM(), inputSatoshis, inputIndex)
      const sig = signTx(tx_, privKey, token.lockingScript.toASM(), inputSatoshis)
      return token.issue(
        new Sig(toHex(sig)),
        new PubKey(toHex(publicKey2)),
        outputAmount,
        outputAmount,
        new Bytes(toHex(preimage))
      )
    }

    expect(testIssue(privateKey1, publicKey2, publicKey1, currTokenId + 1, currTokenId).verify({ tx: tx_, inputIndex, inputSatoshis })).to.equal(true);

    // issuer must not change
    expect(() => { testIssue(privateKey1, publicKey2, publicKey2, currTokenId + 1, currTokenId).verify({ tx: tx_, inputIndex, inputSatoshis }) }).to.throws(/failed to verify/);
    
    // unauthorized key
    expect(() => { testIssue(privateKey2, publicKey2, publicKey1, currTokenId + 1, currTokenId).verify({ tx: tx_, inputIndex, inputSatoshis }) }).to.throws(/failed to verify/);
    
    // mismatched next token ID
    expect(() => { testIssue(privateKey1, publicKey2, publicKey1, currTokenId + 2, currTokenId).verify({ tx: tx_, inputIndex, inputSatoshis }) }).to.throws(/failed to verify/);
    
    // mismatched issued token ID
    expect(() => { testIssue(privateKey1, publicKey2, publicKey1, currTokenId + 1, currTokenId - 1).verify({ tx: tx_, inputIndex, inputSatoshis }) }).to.throws(/failed to verify/);
  });

  it('should succeed when a token is transferred', () => {
    token.dataLoad = num2bin(currTokenId, DataLen) + toHex(sender)
    
    const testTransfer = (privKey, receiver, receivedTokenId = currTokenId) => {
      tx_ = new bsv.Transaction()

      tx_.addInput(new bsv.Transaction.Input({
        prevTxId: dummyTxId,
        outputIndex: 0,
        script: ''
      }), bsv.Script.fromASM(token.lockingScript.toASM()), inputSatoshis)

      const newLockingScript0 = lockingScriptCodePart + ' OP_RETURN ' + num2bin(receivedTokenId, DataLen) + toHex(receiver)
      tx_.addOutput(new bsv.Transaction.Output({
        script: bsv.Script.fromASM(newLockingScript0),
        satoshis: outputAmount
      }))

      const preimage = getPreimage(tx_, token.lockingScript.toASM(), inputSatoshis, inputIndex)
      const sig = signTx(tx_, privKey, token.lockingScript.toASM(), inputSatoshis)
      return token.transfer(
        new Sig(toHex(sig)),
        new PubKey(toHex(publicKey2)),
        outputAmount,
        new Bytes(toHex(preimage))
      )
    }

    expect(testTransfer(privateKey1, publicKey2, currTokenId).verify({ tx: tx_, inputIndex, inputSatoshis })).to.equal(true);
    
    // unauthorized key
    expect(() => { testTransfer(privateKey2, publicKey2, currTokenId).verify({ tx: tx_, inputIndex, inputSatoshis }) }).to.throws(/failed to verify/);

    // token ID must not change
    expect(() => { testTransfer(privateKey1, publicKey2, currTokenId + 2).verify({ tx: tx_, inputIndex, inputSatoshis }) }).to.throws(/failed to verify/);
  });

  it('should fail if receiver is the isssuer when a new token is issued, so issuer can not double mint', () => {
    token.dataLoad = num2bin(currTokenId, DataLen) + toHex(issuer)
    
    const testIssue = (privKey, receiver, newIssuer = issuer, nextTokenId = currTokenId + 1, issuedTokenId = currTokenId) => {
      tx_ = new bsv.Transaction()

      tx_.addInput(new bsv.Transaction.Input({
        prevTxId: dummyTxId,
        outputIndex: 0,
        script: ''
      }), bsv.Script.fromASM(token.lockingScript.toASM()), inputSatoshis)

      const newLockingScript0 = lockingScriptCodePart + ' OP_RETURN ' + num2bin(nextTokenId, DataLen) + toHex(newIssuer)
      tx_.addOutput(new bsv.Transaction.Output({
        script: bsv.Script.fromASM(newLockingScript0),
        satoshis: outputAmount
      }))

      const newLockingScript1 = lockingScriptCodePart + ' OP_RETURN ' + num2bin(issuedTokenId, DataLen) + toHex(issuer) // set token receiver to be issuer
      tx_.addOutput(new bsv.Transaction.Output({
        script: bsv.Script.fromASM(newLockingScript1),
        satoshis: outputAmount
      }))

      const preimage = getPreimage(tx_, token.lockingScript.toASM(), inputSatoshis, inputIndex)
      const sig = signTx(tx_, privKey, token.lockingScript.toASM(), inputSatoshis)
      return token.issue(
        new Sig(toHex(sig)),
        new PubKey(toHex(publicKey2)),
        outputAmount,
        outputAmount,
        new Bytes(toHex(preimage))
      )
    }

    expect(() => { testIssue(privateKey1, publicKey2, publicKey1, currTokenId + 1, currTokenId).verify({ tx: tx_, inputIndex, inputSatoshis }) }).to.throws(/failed to verify/);

  })
});
