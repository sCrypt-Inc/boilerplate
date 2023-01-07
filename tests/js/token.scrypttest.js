const { expect } = require('chai');
const { bsv, buildContractClass, signTx, toHex, getPreimage, Sig, PubKey, SigHashPreimage } = require('scryptlib');
const { inputIndex, inputSatoshis, newTx, compileContract } = require('../../helper');

const tx = newTx();

const outputAmount = 222222

describe('Test sCrypt contract Token In Javascript', () => {
  let token, getPreimageAfterTransfer, result

  const privateKey1 = bsv.PrivateKey.fromRandom('testnet')
  const publicKey1 = bsv.PublicKey.fromPrivateKey(privateKey1)
  const privateKey2 = bsv.PrivateKey.fromRandom('testnet')
  const publicKey2 = bsv.PublicKey.fromPrivateKey(privateKey2)
  
  before(() => {
    const desc = compileContract('token.scrypt');
    const Token = buildContractClass(desc);
    token = new Token([{
      pubKey: PubKey(toHex(publicKey1)),
      balance: 100
    }, {
      pubKey: PubKey(toHex(publicKey2)),
      balance: 0
    }])

    
    getPreimageAfterTransfer = (balance1, balance2) => {
      const newLockingScript = token.getNewStateScript({
        accounts: [{
          pubKey: PubKey(toHex(publicKey1)),
          balance: balance1
        }, {
          pubKey: PubKey(toHex(publicKey2)),
          balance: balance2
        }]
      })
      tx.addOutput(new bsv.Transaction.Output({
        script: newLockingScript,
        satoshis: outputAmount
      }))

      return getPreimage(tx, token.lockingScript, inputSatoshis)
    }

    token.txContext = { tx, inputIndex, inputSatoshis }
  });

  it('should succeed when publicKey1 transfers 40 tokens to publicKey2', () => {
    // after transfer 40 tokens: publicKey1 has 60, publicKey2 40
    const preimage = getPreimageAfterTransfer(60, 40)
    const sig1 = signTx(tx, privateKey1, token.lockingScript, inputSatoshis)
    result = token.transfer(
        PubKey(toHex(publicKey1)),
        Sig(toHex(sig1)),
        PubKey(toHex(publicKey2)),
        40,
        SigHashPreimage(toHex(preimage)),
        outputAmount
      ).verify()
    expect(result.success, result.error).to.be.true
  });

  it('should fail due to wrong balances', () => {
    // after transfer 40 tokens: publicKey1 has 60, publicKey2 40
    const preimage = getPreimageAfterTransfer(60, 30)
    const sig1 = signTx(tx, privateKey1, token.lockingScript, inputSatoshis)
    result = token.transfer(
          PubKey(toHex(publicKey1)),
          Sig(toHex(sig1)),
          PubKey(toHex(publicKey2)),
          40,
          SigHashPreimage(toHex(preimage)),
          outputAmount
        ).verify()
    expect(result.success, result.error).to.be.false
  });

  it('should fail when publicKey2 transfers 40 tokens to publicKey1 due to insufficient balance', () => {
    const preimage = getPreimageAfterTransfer(60, 40)
    const sig2 = signTx(tx, privateKey2, token.lockingScript, inputSatoshis)
    result = token.transfer(
          PubKey(toHex(publicKey2)),
          Sig(toHex(sig2)),
          PubKey(toHex(publicKey1)),
          40,
          SigHashPreimage(toHex(preimage)),
          outputAmount
        ).verify()
    expect(result.success, result.error).to.be.false
  });

  it('should fail when publicKey1 transfers 40 tokens to publicKey2 due to wrong signature', () => {
    const preimage = getPreimageAfterTransfer(60, 40)
    const sig2 = signTx(tx, privateKey2, token.lockingScript, inputSatoshis)
    result = token.transfer(
          PubKey(toHex(publicKey1)),
          Sig(toHex(sig2)),
          PubKey(toHex(publicKey2)),
          40,
          SigHashPreimage(toHex(preimage)),
          outputAmount
        ).verify()
    expect(result.success, result.error).to.be.false
  });
});
