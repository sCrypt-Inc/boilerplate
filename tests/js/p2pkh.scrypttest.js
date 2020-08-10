const { expect } = require('chai');
const { bsv, buildContractClass, Ripemd160, Sig, PubKey, signTx, toHex } = require('scryptlib');

/**
 * an example test for contract containing signature verification
 */
const { compileContract, inputIndex, inputSatoshis, tx } = require('../../helper');

// const privateKey = new bsv.PrivateKey.fromRandom('testnet')
const privateKey = new bsv.PrivateKey.fromWIF('cVy4oDYbkxCENYEjAD2aZyyGVbWQZPXt2rit8VAk1qiS9iJMgYtp')
const publicKey = privateKey.publicKey
const pkh = bsv.crypto.Hash.sha256ripemd160(publicKey.toBuffer())
const privateKey2 = new bsv.PrivateKey.fromRandom('testnet')

describe('Test sCrypt contract DemoP2PKH In Javascript', () => {
  let demo
  let sig

  before(() => {
    const DemoP2PKH = buildContractClass(compileContract('p2pkh.scrypt'))
    demo = new DemoP2PKH(new Ripemd160(toHex(pkh)))
  });

  it('signature check should succeed when right private key signs', () => {
    sig = signTx(tx, privateKey, demo.lockingScript.toASM(), inputSatoshis)
    expect(demo.unlock(new Sig(toHex(sig)), new PubKey(toHex(publicKey))).verify( { tx, inputSatoshis, inputIndex } )).to.equal(true);
    /*
     * print out parameters used in debugger, see ""../.vscode/launch.json" for an example
      console.log(toHex(pkh))
      console.log(toHex(sig))
      console.log(toHex(publicKey))
      console.log(tx.uncheckedSerialize())
    */
  });

  it('signature check should fail when wrong private key signs', () => {
    sig = signTx(tx, privateKey2, demo.lockingScript.toASM(), inputSatoshis)
    expect(() => { demo.unlock(new Sig(toHex(sig)), new PubKey(toHex(publicKey))).verify( { tx, inputSatoshis, inputIndex } ) }).to.throws(/failed to verify/);
  });
});
