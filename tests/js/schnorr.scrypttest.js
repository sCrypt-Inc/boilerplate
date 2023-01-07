const { expect } = require('chai');
const { buildContractClass, bsv, PubKey, Bytes, Sig, toHex, Int } = require('scryptlib');
const { compileContract } = require('../../helper');
const bsvPoint = bsv.crypto.Point;

const EC = require('elliptic').ec;
const ec = new EC('secp256k1');

const p = ec.curve.p;
const G = bsvPoint.getG();
const N = bsvPoint.getN();

describe('Heavy: Test sCrypt contract Schnorr In Javascript', () => {
  const pk = bsv.PrivateKey.fromRandom('testnet');
  const publicKey = bsv.PublicKey(Object.assign(
    pk.publicKey.toJSON(), { compressed: false, network: 'testnet' }))

  let X, sig, m, st, result;
  
  before(() => {
    m = Buffer.from("test schnorr BitcoinSV");

    const sha256Data = bsv.crypto.Hash.sha256(m);
    const r = bsv.PrivateKey.fromBuffer(sha256Data.reverse(), 'testnet')
    const rBN = r.toBigNumber();

    //R = r × G
    const R = G.mul(rBN);
  
    //s = r + hash(r, P, m) ⋅ pk
    //        hash(r, P, m)
    const rPmHash = bsv.crypto.Hash.sha256(Buffer.concat([
      Buffer.from(rBN.toBuffer().reverse(), 'hex'), 
      Buffer.from(toHex(publicKey), 'hex'), 
      m]));
    const rPmBig = bsv.crypto.BN.fromBuffer(rPmHash);

    //s = r + hash(r, P, m) ⋅ pk
    const s = rBN.add(rPmBig.mul(pk.toBigNumber())).mod(N);

    sig = Buffer.concat([
      Buffer.from(rBN.toBuffer().reverse(), 'hex'), 
      Buffer.from(s.toBuffer(), 'hex')
    ]);

    const contra = compileContract('schnorr.scrypt');
    SchnorrTest = buildContractClass(contra);

    X = {
      x: Int(R.getX().toString()),
      y: Int(R.getY().toString())
    }
  
    st = new SchnorrTest();
  });

  it('should return true', () => {
    result = st.verify(
      Sig(toHex(sig)), 
      PubKey(toHex(publicKey)), 
      Bytes(toHex(m)), 
      X).verify();

    expect(result.success, result.error).to.be.true
  });

  it('should fail with invalid publicKeyX', () => {
    const wrongPk = bsv.PrivateKey.fromRandom('testnet');
    const wrongPublicKey = bsv.PublicKey(Object.assign(
      wrongPk.publicKey.toJSON(), { compressed: false, network: 'testnet' }));

    result = st.verify(
      Sig(toHex(sig)), 
      PubKey(toHex(wrongPublicKey)), 
      Bytes(toHex(m)), 
      X).verify();

    expect(result.success, result.error).to.be.false
  });

  it('should fail with invalid message', () => {
    result = st.verify(
      Sig(toHex(sig)), 
      PubKey(toHex(publicKey)), 
      Bytes(toHex(m) + "11"), 
      X).verify();

    expect(result.success, result.error).to.be.false
  });

  it('should fail with invalid sig', () => {
    const wrongSig = Buffer.concat([
      Buffer.from("1111113c7c06fb73bc019fc657aaa3f4e48287649fb9fff8bb54b148d9b8fe9a", 'hex'), 
      Buffer.from("000000953a35e8424a7f2afdcefcae68130d3e19884fce8bb802b9cc6b9776d6", 'hex')
    ]);

    result = st.verify(
      Sig(toHex(wrongSig)), 
      PubKey(toHex(publicKey)), 
      Bytes(toHex(m)), 
      X).verify();

    expect(result.success, result.error).to.be.false
  });
});
