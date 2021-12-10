import { expect } from 'chai';
import { buildContractClass, signTx, toHex, bsv, Ripemd160, PubKey, Sig, VerifyResult } from 'scryptlib';
import { compileContract, newTx } from "../../helper";

/**
 * an example p2npkh test for contract containing signature verification
 */
import { inputIndex, inputSatoshis, tx } from '../../helper';

const privateKey = new bsv.PrivateKey.fromRandom('testnet')
const publicKey = privateKey.publicKey
const pkh = bsv.crypto.Hash.sha256ripemd160(publicKey.toBuffer())
const privateKey2 = new bsv.PrivateKey.fromRandom('testnet')

describe('Test sCrypt contract DemoP2NPKH In Typescript', () => {
  let demo: any;
  let sig: any;
  let result: VerifyResult
  let tx:any = newTx();

  before(() => {
    const DemoP2PKH = buildContractClass(compileContract('p2npkh.scrypt'))
    demo = new DemoP2PKH()
    const publicKeyHash = bsv.crypto.Hash.sha256ripemd160(publicKey.toBuffer())
    const asmVars = {
      'DemoP2NPKH.unlock.pkh': toHex(publicKeyHash),
      'DemoP2NPKH.unlock.asset': '000000000000000000000000000000000000000000000000000000000000000000000000'
    };
    demo.replaceAsmVars(asmVars);
    demo.txContext = {
      tx,
      inputIndex,
      inputSatoshis
    }
  });

  it('signature check should succeed when right private key signs', () => {
    sig = signTx(tx, privateKey, demo.lockingScript, inputSatoshis)
    result = demo.unlock(new Sig(toHex(sig)), new PubKey(toHex(publicKey))).verify()
    expect(result.success, result.error).to.be.true
  });

  it('signature check should fail when wrong private key signs', () => {
    sig = signTx(tx, privateKey2, demo.lockingScript, inputSatoshis)
    result = demo.unlock(new Sig(toHex(sig)), new PubKey(toHex(publicKey))).verify()
    expect(result.success, result.error).to.be.false
  });
});
