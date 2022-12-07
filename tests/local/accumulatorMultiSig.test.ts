import { expect } from 'chai';
import { Ripemd160, bsv, toHex, PubKey, Sig, signTx  } from 'scrypt-ts';
import { AccumulatorMultiSig } from '../../src/contracts/accumulatorMultiSig';
import { newTx, inputIndex, inputSatoshis } from '../txHelper';

describe('Test SmartContract `AccumulatorMultiSig`', () => {

  const privateKey1 = bsv.PrivateKey.fromRandom('testnet');
  const publicKey1 = bsv.PublicKey.fromPrivateKey(privateKey1);
  const publicKeyHash1 = bsv.crypto.Hash.sha256ripemd160(publicKey1.toBuffer());


  const privateKey2 = bsv.PrivateKey.fromRandom('testnet');
  const publicKey2 = bsv.PublicKey.fromPrivateKey(privateKey2);
  const publicKeyHash2 = bsv.crypto.Hash.sha256ripemd160(publicKey2.toBuffer());


  const privateKey3 = bsv.PrivateKey.fromRandom('testnet');
  const publicKey3 = bsv.PublicKey.fromPrivateKey(privateKey3);
  const publicKeyHash3 = bsv.crypto.Hash.sha256ripemd160(publicKey3.toBuffer());


  const privateKeyWrong = bsv.PrivateKey.fromRandom('testnet');
  const publicKeyWrong = bsv.PublicKey.fromPrivateKey(privateKeyWrong);


  before(async () => {
    await AccumulatorMultiSig.compile();
  })

  it('should successfully with all three right.', () => {

    const accumulatorMultiSig = new AccumulatorMultiSig(2n,
      [new Ripemd160(toHex(publicKeyHash1)), new Ripemd160(toHex(publicKeyHash2)), new Ripemd160(toHex(publicKeyHash3))]);

    const tx = newTx();

    accumulatorMultiSig.unlockFrom = { tx, inputIndex }

    let result = accumulatorMultiSig.verify((self) => {
      const sig1 = signTx(tx, privateKey1, self.lockingScript, inputSatoshis);

      const sig2 = signTx(tx, privateKey2, self.lockingScript, inputSatoshis);

      const sig3 = signTx(tx, privateKey3, self.lockingScript, inputSatoshis);

      self.main([new PubKey(toHex(publicKey1)), new PubKey(toHex(publicKey2)), new PubKey(toHex(publicKey3))],
        [new Sig(toHex(sig1)), new Sig(toHex(sig2)), new Sig(toHex(sig3))], [true, true, true]);
    });

    expect(result.success, result.error).to.eq(true);

  })


  it('should successfully with two right.', () => {

    const accumulatorMultiSig = new AccumulatorMultiSig(2n,
      [new Ripemd160(toHex(publicKeyHash1)), new Ripemd160(toHex(publicKeyHash2)), new Ripemd160(toHex(publicKeyHash3))]);

    const tx = newTx();

    accumulatorMultiSig.unlockFrom = { tx, inputIndex }

    let result = accumulatorMultiSig.verify((self) => {
      const sig1 = signTx(tx, privateKey1, self.lockingScript, inputSatoshis);

      const sig2 = signTx(tx, privateKey2, self.lockingScript, inputSatoshis);

      const sig3 = signTx(tx, privateKeyWrong, self.lockingScript, inputSatoshis);

      self.main([new PubKey(toHex(publicKey1)), new PubKey(toHex(publicKey2)), new PubKey(toHex(publicKey3))],
        [new Sig(toHex(sig1)), new Sig(toHex(sig2)), new Sig(toHex(sig3))], [true, true, false]);
    });

    expect(result.success, result.error).to.eq(true);

  })

  it('should throw with only one right.', () => {

    const accumulatorMultiSig = new AccumulatorMultiSig(2n,
      [new Ripemd160(toHex(publicKeyHash1)), new Ripemd160(toHex(publicKeyHash2)), new Ripemd160(toHex(publicKeyHash3))]);

    const tx = newTx();

    accumulatorMultiSig.unlockFrom = { tx, inputIndex }

    expect(() => {
      let result = accumulatorMultiSig.verify((self) => {
        const sig1 = signTx(tx, privateKey1, self.lockingScript, inputSatoshis);

        const sig2 = signTx(tx, privateKeyWrong, self.lockingScript, inputSatoshis);

        const sig3 = signTx(tx, privateKeyWrong, self.lockingScript, inputSatoshis);

        self.main([new PubKey(toHex(publicKey1)), new PubKey(toHex(publicKey2)), new PubKey(toHex(publicKey3))],
          [new Sig(toHex(sig1)), new Sig(toHex(sig2)), new Sig(toHex(sig3))], [true, false, false]);
      });
    }).to.throw(/Execution failed/)

  })
})