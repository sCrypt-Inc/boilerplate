import { expect } from 'chai';
import { buildContractClass, signTx, toHex, bsv, Ripemd160, PubKey, Sig, VerifyResult } from 'scryptlib';
import { compileContract, newTx } from "../../helper";

/**
 * An example P2NFTPKH test for contract containing signature verification
 */
import { inputIndex, inputSatoshis, tx } from '../../helper';

const privateKey = bsv.PrivateKey.fromRandom('testnet')
const publicKey = privateKey.publicKey
const pkh = bsv.crypto.Hash.sha256ripemd160(publicKey.toBuffer())
const privateKey2 = bsv.PrivateKey.fromRandom('testnet')

describe('Test sCrypt contract P2NFTPKH In Typescript', () => {
  let demo: any;
  let sig: any;
  let result: VerifyResult
  let tx:any = newTx();

  before(() => {
    const P2NFTPKH = buildContractClass(compileContract('p2nftpkh.scrypt'))
    demo = new P2NFTPKH()
    const publicKeyHash = bsv.crypto.Hash.sha256ripemd160(publicKey.toBuffer())
    const asmVars = {
      'P2NFTPKH.unlock.pkh': toHex(publicKeyHash),
      'P2NFTPKH.unlock.asset': '000000000000000000000000000000000000000000000000000000000000000000000000'
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
    result = demo.unlock(Sig(toHex(sig)), PubKey(toHex(publicKey))).verify()
    expect(result.success, result.error).to.be.true
  });

  it('signature check should fail when wrong private key signs', () => {
    sig = signTx(tx, privateKey2, demo.lockingScript, inputSatoshis)
    result = demo.unlock(Sig(toHex(sig)), PubKey(toHex(publicKey))).verify()
    expect(result.success, result.error).to.be.false
  });
});
