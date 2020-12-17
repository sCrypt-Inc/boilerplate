/**
 * Test for HashPuzzleP2PKH contract in TypeScript
 **/
import { expect } from 'chai';
import { buildContractClass, signTx, toHex, bsv, PubKey, Sig, Bytes, Sha256, Ripemd160, VerifyResult } from 'scryptlib';
import { inputIndex, inputSatoshis, newTx, compileContract } from '../../helper';

// Test keys
const privateKey = new bsv.PrivateKey.fromRandom('testnet')
const publicKey = privateKey.publicKey
const pkh = bsv.crypto.Hash.sha256ripemd160(publicKey.toBuffer())
const privateKey2 = new bsv.PrivateKey.fromRandom('testnet')

// NIST Test Vector(s) (https://www.nist.gov/itl/ssd/software-quality-group/nsrl-test-data)
const dataBuffer = Buffer.from("abc");
const data =  dataBuffer
const sha256Data = bsv.crypto.Hash.sha256(dataBuffer);

describe('Test sCrypt contract HashPuzzleP2PKH In TypeScript', () => {
  let hashPuzzleP2PKH: any
  let sig: any
  let result: VerifyResult
  let tx:any = newTx();

  before(() => {
    const HashPuzzleP2PKH = buildContractClass(compileContract('hashpuzzlep2pkh.scrypt'))
    hashPuzzleP2PKH = new HashPuzzleP2PKH(new Ripemd160(toHex(pkh)), new Sha256(toHex(sha256Data)))
    hashPuzzleP2PKH.txContext = { tx, inputIndex, inputSatoshis }
  });

  it('signature check should succeed when correct private key signs & correct data provided', () => {
    sig = signTx(tx, privateKey, hashPuzzleP2PKH.lockingScript.toASM(), inputSatoshis)
    result = hashPuzzleP2PKH.verify(new Bytes(toHex(data)), new Sig(toHex(sig)), new PubKey(toHex(publicKey))).verify()
    expect(result.success, result.error).to.be.true
  });

  it('signature check should fail when correct private key signs & wrong data provided', () => {
    sig = signTx(tx, privateKey, hashPuzzleP2PKH.lockingScript.toASM(), inputSatoshis)
    result = hashPuzzleP2PKH.verify(new Bytes(toHex('abcdef')), new Sig(toHex(sig)), new PubKey(toHex(publicKey))).verify()
    expect(result.success, result.error).to.be.false
  });

  it('signature check should fail when wrong private key signs & correct data provided', () => {
    sig = signTx(tx, privateKey2, hashPuzzleP2PKH.lockingScript.toASM(), inputSatoshis)
    result = hashPuzzleP2PKH.verify(new Bytes(toHex(data)), new Sig(toHex(sig)), new PubKey(toHex(publicKey))).verify()
    expect(result.success, result.error).to.be.false
  });

  it('signature check should fail when wrong private key signs & wrong data provided', () => {
    sig = signTx(tx, privateKey2, hashPuzzleP2PKH.lockingScript.toASM(), inputSatoshis)
    result = hashPuzzleP2PKH.verify(new Bytes(toHex('abcdef')), new Sig(toHex(sig)), new PubKey(toHex(publicKey))).verify()
    expect(result.success, result.error).to.be.false
  });

});
