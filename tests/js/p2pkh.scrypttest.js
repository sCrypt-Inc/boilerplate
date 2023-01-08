const { expect } = require('chai');
const { bsv, buildContractClass, PubKeyHash, Sig, PubKey, signTx, toHex } = require('scryptlib');

/**
 * an example test for contract containing signature verification
 */
const { compileContract, inputIndex, inputSatoshis, newTx } = require('../../helper');

const privateKey = bsv.PrivateKey.fromRandom('testnet')
const publicKey = privateKey.publicKey
const pkh = bsv.crypto.Hash.sha256ripemd160(publicKey.toBuffer())
const privateKey2 = bsv.PrivateKey.fromRandom('testnet')
const tx = newTx();

describe('Test sCrypt contract DemoP2PKH In Javascript', () => {
  let demo, sig, context

  before(() => {
    const DemoP2PKH = buildContractClass(compileContract('p2pkh.scrypt'))
    demo = new DemoP2PKH(PubKeyHash(toHex(pkh)))
    // any contract that includes checkSig() must be verified in a given context
    context = { tx, inputIndex, inputSatoshis }
  });

  it('signature check should succeed when right private key signs', () => {
    sig = signTx(tx, privateKey, demo.lockingScript, inputSatoshis)
    result = demo.unlock(Sig(toHex(sig)), PubKey(toHex(publicKey))).verify(context)
    expect(result.success, result.error).to.be.true
    // got launch.json
    // const file = demo.unlock(Sig(toHex(sig)), PubKey(toHex(publicKey))).genLaunchConfig()
    // console.log(file)
  });

  it('signature check should fail when wrong private key signs', () => {
    sig = signTx(tx, privateKey2, demo.lockingScript, inputSatoshis)
    result = demo.unlock(Sig(toHex(sig)), PubKey(toHex(publicKey))).verify(context)
    expect(result.success, result.error).to.be.false
  });
});
