const { expect } = require('chai');
const { bsv, buildContractClass, Ripemd160, Sig, PubKey, signTx, toHex } = require('scryptlib');
const { compileContract, inputIndex, inputSatoshis, newTx } = require('../../helper');



const privateKey1 = new bsv.PrivateKey.fromRandom('testnet')
const publicKey1 = bsv.PublicKey.fromPrivateKey(privateKey1)
const pkh1 = bsv.crypto.Hash.sha256ripemd160(publicKey1.toBuffer())
const privateKey2 = new bsv.PrivateKey.fromRandom('testnet')
const publicKey2 = bsv.PublicKey.fromPrivateKey(privateKey2)
const pkh2 = bsv.crypto.Hash.sha256ripemd160(publicKey2.toBuffer())
const privateKey3 = new bsv.PrivateKey.fromRandom('testnet')
const publicKey3 = bsv.PublicKey.fromPrivateKey(privateKey3)
const pkh3 = bsv.crypto.Hash.sha256ripemd160(publicKey3.toBuffer())

const tx = newTx();

describe('Test sCrypt contract MultiSig In Javascript', () => {
  let multiSig, result,  context

  before(() => {
    const MultiSig = buildContractClass(compileContract('multiSig.scrypt'));
    multiSig = new MultiSig([new Ripemd160(toHex(pkh1)), new Ripemd160(toHex(pkh2)), new Ripemd160(toHex(pkh3))]);
    context = { tx, inputIndex, inputSatoshis }
  });

  it('should return true', () => {
    const sig1 = signTx(tx, privateKey1, multiSig.lockingScript.toASM(), inputSatoshis)
    const sig2 = signTx(tx, privateKey2, multiSig.lockingScript.toASM(), inputSatoshis)
    const sig3 = signTx(tx, privateKey3, multiSig.lockingScript.toASM(), inputSatoshis)
    result = multiSig.unlock([new PubKey(toHex(publicKey1)), new PubKey(toHex(publicKey2)), new PubKey(toHex(publicKey3))], 
      [new Sig(toHex(sig1)), new Sig(toHex(sig2)),new Sig(toHex(sig3))] ).verify(context)
    expect(result.success, result.error).to.be.true
  });

  it('signature check should fail when wrong private key signs', () => {
    const sig1 = signTx(tx, privateKey1, multiSig.lockingScript.toASM(), inputSatoshis)
    const sig2 = signTx(tx, privateKey1, multiSig.lockingScript.toASM(), inputSatoshis)
    const sig3 = signTx(tx, privateKey1, multiSig.lockingScript.toASM(), inputSatoshis)
    result = multiSig.unlock([new PubKey(toHex(publicKey1)), new PubKey(toHex(publicKey2)), new PubKey(toHex(publicKey3))], 
      [new Sig(toHex(sig1)), new Sig(toHex(sig2)),new Sig(toHex(sig3))] ).verify(context)
    expect(result.success, result.error).to.be.false
  });

});
