const { expect } = require('chai');
const { bsv, buildContractClass, signTx, toHex, getPreimage, num2bin, PubKey, SigHashPreimage, Sig } = require('scryptlib');
const { inputIndex, inputSatoshis, compileContract, DataLen, dummyTxId } = require('../../helper');


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
  const actionIssue = '00'
  const actionTransfer = '01'

  before(() => {
    const Token = buildContractClass(compileContract('nonFungibleToken.scrypt'))
    token = new Token()

    // code part
    lockingScriptCodePart = token.codePart.toASM()
  });

  it('should succeed when one new token is issued', () => {
    token.setDataPart(num2bin(currTokenId, DataLen) + toHex(issuer) + actionIssue)
    const testIssue = (privKey, receiver, newIssuer = issuer, nextTokenId = currTokenId + 1, issuedTokenId = currTokenId) => {
      const tx = new bsv.Transaction()

      tx.addInput(new bsv.Transaction.Input({
        prevTxId: dummyTxId,
        outputIndex: 0,
        script: ''
      }), bsv.Script.fromASM(token.lockingScript.toASM()), inputSatoshis)

      const newLockingScript0 = [lockingScriptCodePart, num2bin(nextTokenId, DataLen) + toHex(newIssuer) + actionIssue].join(' ')
      tx.addOutput(new bsv.Transaction.Output({
        script: bsv.Script.fromASM(newLockingScript0),
        satoshis: outputAmount
      }))

      const newLockingScript1 = [lockingScriptCodePart, num2bin(issuedTokenId, DataLen) + toHex(receiver) + actionTransfer].join(' ')
      tx.addOutput(new bsv.Transaction.Output({
        script: bsv.Script.fromASM(newLockingScript1),
        satoshis: outputAmount
      }))

      token.txContext = { tx, inputIndex, inputSatoshis }

      const preimage = getPreimage(tx, token.lockingScript.toASM(), inputSatoshis, inputIndex)
      const sig = signTx(tx, privKey, token.lockingScript.toASM(), inputSatoshis)
      return token.issue(
        new Sig(toHex(sig)),
        new PubKey(toHex(receiver)),
        outputAmount,
        outputAmount,
        new SigHashPreimage(toHex(preimage))
      )
    }

    result = testIssue(privateKey1, publicKey2, publicKey1, currTokenId + 1, currTokenId).verify()
    expect(result.success, result.error).to.be.true

    // issuer must not change
    result = testIssue(privateKey1, publicKey2, publicKey2, currTokenId + 1, currTokenId).verify()
    expect(result.success, result.error).to.be.false

    // unauthorized key
    result = testIssue(privateKey2, publicKey2, publicKey1, currTokenId + 1, currTokenId).verify()
    expect(result.success, result.error).to.be.false

    // mismatched next token ID
    result = testIssue(privateKey1, publicKey2, publicKey1, currTokenId + 2, currTokenId).verify()
    expect(result.success, result.error).to.be.false

    // mismatched issued token ID
    result = testIssue(privateKey1, publicKey2, publicKey1, currTokenId + 1, currTokenId - 1).verify()
    expect(result.success, result.error).to.be.false
  });

  it('should succeed when a token is transferred', () => {
    token.setDataPart(num2bin(currTokenId, DataLen) + toHex(sender) + actionTransfer)

    const testTransfer = (privKey, receiver, receivedTokenId = currTokenId) => {
      const tx = new bsv.Transaction()

      tx.addInput(new bsv.Transaction.Input({
        prevTxId: dummyTxId,
        outputIndex: 0,
        script: ''
      }), bsv.Script.fromASM(token.lockingScript.toASM()), inputSatoshis)

      const newLockingScript0 = [lockingScriptCodePart, num2bin(receivedTokenId, DataLen) + toHex(receiver) + actionTransfer].join(' ')
      tx.addOutput(new bsv.Transaction.Output({
        script: bsv.Script.fromASM(newLockingScript0),
        satoshis: outputAmount
      }))

      token.txContext = { tx, inputIndex, inputSatoshis }

      const preimage = getPreimage(tx, token.lockingScript.toASM(), inputSatoshis, inputIndex)
      const sig = signTx(tx, privKey, token.lockingScript.toASM(), inputSatoshis)
      return token.transfer(
        new Sig(toHex(sig)),
        new PubKey(toHex(receiver)),
        outputAmount,
        new SigHashPreimage(toHex(preimage))
      )
    }

    result = testTransfer(privateKey1, publicKey2, currTokenId).verify()
    expect(result.success, result.error).to.be.true

    // unauthorized key
    result = testTransfer(privateKey2, publicKey2, currTokenId).verify()
    expect(result.success, result.error).to.be.false

    // token ID must not change
    result = testTransfer(privateKey1, publicKey2, currTokenId + 2).verify()
    expect(result.success, result.error).to.be.false
  });

  it('should fail when receiver pretending to be the issuer', () => {
    token.setDataPart(num2bin(currTokenId, DataLen) + toHex(sender) + actionTransfer)

    const testIssue = (privKey, receiver, newIssuer = issuer, nextTokenId = currTokenId + 1, issuedTokenId = currTokenId) => {
      const tx = new bsv.Transaction()

      tx.addInput(new bsv.Transaction.Input({
        prevTxId: dummyTxId,
        outputIndex: 0,
        script: ''
      }), bsv.Script.fromASM(token.lockingScript.toASM()), inputSatoshis)

      const newLockingScript0 = [lockingScriptCodePart, num2bin(nextTokenId, DataLen) + toHex(newIssuer) + actionIssue].join(' ')
      tx.addOutput(new bsv.Transaction.Output({
        script: bsv.Script.fromASM(newLockingScript0),
        satoshis: outputAmount
      }))

       // set token receiver to be issuer
      const newLockingScript1 = [lockingScriptCodePart, num2bin(issuedTokenId, DataLen) + toHex(receiver) + actionTransfer].join(' ')
      tx.addOutput(new bsv.Transaction.Output({
        script: bsv.Script.fromASM(newLockingScript1),
        satoshis: outputAmount
      }))

      token.txContext = { tx, inputIndex, inputSatoshis }

      const preimage = getPreimage(tx, token.lockingScript.toASM(), inputSatoshis, inputIndex)
      const sig = signTx(tx, privKey, token.lockingScript.toASM(), inputSatoshis)
      return token.issue(
        new Sig(toHex(sig)),
        new PubKey(toHex(receiver)),
        outputAmount,
        outputAmount,
        new SigHashPreimage(toHex(preimage))
      )
    }

    result = testIssue(privateKey1, publicKey2, publicKey1, currTokenId + 1, currTokenId).verify()
    expect(result.success, result.error).to.be.false
  })
});
