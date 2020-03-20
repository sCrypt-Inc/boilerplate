import * as path from 'path';
import { expect } from 'chai';
import { buildContractClass, bsv } from 'scrypttest';

/**
 * an example test for contract containing signature verification
 */
import { inputIndex, inputSatoshis, tx, signTx, toHex } from '../testHelper';

const privateKey = new bsv.PrivateKey.fromRandom('testnet')
const publicKey = privateKey.publicKey
const pkh = bsv.crypto.Hash.sha256ripemd160(publicKey.toBuffer())
const privateKey2 = new bsv.PrivateKey.fromRandom('testnet')

describe('Test sCrypt contract DemoP2PKH In Typescript', () => {
  let demo: any;
  let sig: any;

  before(() => {
    const DemoP2PKH = buildContractClass(path.join(__dirname, '../../contracts/p2pkh.scrypt'), tx, inputIndex, inputSatoshis)
    demo = new DemoP2PKH(toHex(pkh))
  });

  it('signature check should succeed when right private key signs', () => {
    sig = signTx(tx, privateKey, demo.getScriptPubKey())
    expect(demo.unlock(toHex(sig),  toHex(publicKey))).to.equal(true);
  });

  it('signature check should fail when wrong private key signs', () => {
    sig = signTx(tx, privateKey2, demo.getScriptPubKey())
    expect(demo.unlock(toHex(sig),  toHex(publicKey))).to.equal(false);
  });
});
