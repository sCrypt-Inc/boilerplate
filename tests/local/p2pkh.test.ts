import { expect } from 'chai';
import { PubKey, PubKeyHash, Sig, SigHashPreimage, bsv, getPreimage, signTx, toHex } from 'scrypt-ts';
import { P2PKH } from '../../src/contracts/p2pkh';
import { newTx, inputIndex, inputSatoshis } from './util/txHelper';


const privateKey = bsv.PrivateKey.fromRandom('testnet');
const publicKey = privateKey.publicKey
const pkh = bsv.crypto.Hash.sha256ripemd160(publicKey.toBuffer())

const privateKey2 = bsv.PrivateKey.fromRandom('testnet')



describe('Test SmartContract `P2PKH`', () => {

  before(async () => {
    await P2PKH.compile(); // asm 
  })

  it('should pass if use right privateKey', async () => {
    const tx = newTx();
    let demo = new P2PKH(PubKeyHash(toHex(pkh)))
    demo.unlockFrom = { tx, inputIndex }

    let result = demo.verify(() => {
      const sig = signTx(tx, privateKey, demo.lockingScript, inputSatoshis)
      demo.unlock(Sig(toHex(sig)), PubKey(toHex(publicKey)));
    });

    expect(result.success).to.be.true

  })


  it('should pass if use right privateKey', async () => {
    const inputIndex = 0;
    let p2pkh = new P2PKH(PubKeyHash(toHex(pkh)))
    let callTx: bsv.Transaction = new bsv.Transaction()
      .addDummyInput(p2pkh.lockingScript, inputSatoshis)
      .change(privateKey.toAddress())
      .setInputScript({
        inputIndex,
        privateKey
      }, (tx: bsv.Transaction) => {
        return p2pkh.getUnlockingScript((cloned) => {
          cloned.unlockFrom = { tx, inputIndex }
          cloned.unlock(Sig(tx.getSignature(0) as string), PubKey(toHex(publicKey)))
        })
      })
      .seal();

    let result = callTx.verifyInputScript(inputIndex)

    expect(result.success, result.error).to.eq(true);

  })

  it('should fail if use wrong privateKey', async () => {
    const tx = newTx();
    let demo = new P2PKH(PubKeyHash(toHex(pkh)))
    demo.unlockFrom = { tx, inputIndex }

    expect(() => {
      demo.verify(() => {

        const sig = signTx(tx, privateKey2, demo.lockingScript, inputSatoshis)
        demo.unlock(Sig(toHex(sig)), PubKey(toHex(publicKey)));
      });

    }).to.throw(/Execution failed/);

  })

})