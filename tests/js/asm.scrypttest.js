const { expect } = require('chai');
const { bsv, buildContractClass, Ripemd160, Sig, PubKey, signTx, toHex, Bytes } = require('scryptlib');
const { compileContract, inputIndex, inputSatoshis, newTx } = require('../../helper');

const privateKey = new bsv.PrivateKey.fromRandom('testnet')
const publicKey = privateKey.publicKey
const pkh = bsv.crypto.Hash.sha256ripemd160(publicKey.toBuffer())

const tx = newTx();
describe('Test sCrypt contract Asm In Javascript', () => {
  let asm, result

  before(() => {
    const Asm = buildContractClass(compileContract('asm.scrypt'))
    asm = new Asm()

    // instantiate asm variables
    const asmVars = {
      'Asm.p2pkh.pkh': toHex(pkh),
      'Asm.equalImpl.x': 'OP_11'
    }
    asm.replaceAsmVars(asmVars)
  });

  it('should return true', () => {
    result = asm.double(222, 111).verify()
    expect(result.success, result.error).to.be.true

    result = asm.equal(11).verify()
    expect(result.success, result.error).to.be.true
    
    sig = signTx(tx, privateKey, asm.lockingScript.toASM(), inputSatoshis)
    result = asm.p2pkh(new Sig(toHex(sig)), new PubKey(toHex(publicKey))).verify( { tx, inputSatoshis, inputIndex } )
    expect(result.success, result.error).to.be.true

    result = asm.checkLen(new Bytes('1122ffee'), 4).verify()
    expect(result.success, result.error).to.be.true
    
    result = asm.checkLenFail(new Bytes('1122ffee'), 4).verify()
    expect(result.success, result.error).to.be.false
  });
});
