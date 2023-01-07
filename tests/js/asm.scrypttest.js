const { expect } = require('chai');
const { bsv, buildContractClass, Sig, PubKey, signTx, toHex, Bytes } = require('scryptlib');
const { compileContract, inputIndex, inputSatoshis, newTx } = require('../../helper');

const privateKey = bsv.PrivateKey.fromRandom('testnet')
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
    result = asm.double(222n, 111n).verify()
    expect(result.success, result.error).to.be.true

    result = asm.equal(11n).verify()
    expect(result.success, result.error).to.be.true
    
    sig = signTx(tx, privateKey, asm.lockingScript, inputSatoshis)
    result = asm.p2pkh(Sig(toHex(sig)), PubKey(toHex(publicKey))).verify( { tx, inputSatoshis, inputIndex } )
    expect(result.success, result.error).to.be.true

    result = asm.checkLen(Bytes('1122ffee'), 4n).verify()
    expect(result.success, result.error).to.be.true
    
    result = asm.checkLenFail(Bytes('1122ffee'), 4n).verify()
    expect(result.success, result.error).to.be.false
  });
});
