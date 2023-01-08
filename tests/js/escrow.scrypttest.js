const { expect } = require('chai');
const {
  bsv,
  buildContractClass,
  PubKey,
  getPreimage,
  PubKeyHash,
  Sig,
  signTx,
  toHex,
  Sha256, 
  Bytes,
  SigHashPreimage,
  Int,
} = require('scryptlib');

const {
  compileContract,
  inputIndex,
  inputSatoshis,
  newTx,
} = require('../../helper');

// A: Alice, B: Bob, E: Escrow
// scenario 1: PA + PB
// scenario 2: PA + PE + Hash 1
// scenario 3: PB + PE + Hash 2

const scenario = 1;

const privateKeyA = bsv.PrivateKey.fromRandom('testnet');
const publicKeyA = privateKeyA.publicKey;
const publicKeyHashA = bsv.crypto.Hash.sha256ripemd160(publicKeyA.toBuffer());

const privateKeyB = bsv.PrivateKey.fromRandom('testnet');
const publicKeyB = privateKeyB.publicKey;
const publicKeyHashB = bsv.crypto.Hash.sha256ripemd160(publicKeyB.toBuffer());

const privateKeyE = bsv.PrivateKey.fromRandom('testnet');
const publicKeyE = privateKeyE.publicKey;
const publicKeyHashE = bsv.crypto.Hash.sha256ripemd160(publicKeyE.toBuffer());

const secretBuf1 = Buffer.from("abc");
const hashSecret1 = bsv.crypto.Hash.sha256(secretBuf1);

const secretBuf2 = Buffer.from("def");
const hashSecret2 = bsv.crypto.Hash.sha256(secretBuf2);

const privateKeyChange = bsv.PrivateKey.fromRandom('testnet');
const publicKeyChange = privateKeyChange.publicKey;
const publicKeyHashChange = bsv.crypto.Hash.sha256ripemd160(publicKeyChange.toBuffer());

const fee = 1000;

const tx = newTx();

const amount = inputSatoshis;
const Signature = bsv.crypto.Signature

describe('Test sCrypt contract Escrow in Javascript', () => {
  let escrow, preimage, result;

  before(() => {
    const Escrow = buildContractClass(compileContract('escrow.scrypt'));
    escrow = new Escrow(PubKeyHash(toHex(publicKeyHashA)), PubKeyHash(toHex(publicKeyHashB)), 
      PubKeyHash(toHex(publicKeyHashE)), Sha256(toHex(hashSecret1)), Sha256(toHex(hashSecret2)));

    switch(scenario) {
      case 1:
        tx.addOutput(new bsv.Transaction.Output({
          script: bsv.Script.buildPublicKeyHashOut(privateKeyA.toAddress()),
          satoshis: amount / 2,
        }))

        tx.addOutput(new bsv.Transaction.Output({
          script: bsv.Script.buildPublicKeyHashOut(privateKeyB.toAddress()),
          satoshis: amount / 2,
        }))

        tx.addOutput(new bsv.Transaction.Output({
          script: bsv.Script.buildPublicKeyHashOut(privateKeyChange.toAddress()),
          satoshis: 1000,
        }))

        sigA = signTx(tx, privateKeyA, escrow.lockingScript, amount);
        sigB = signTx(tx, privateKeyB, escrow.lockingScript, amount);

        break;
      case 2:
        tx.addOutput(new bsv.Transaction.Output({
          script: bsv.Script.buildPublicKeyHashOut(privateKeyA.toAddress()),
          satoshis: amount,
        }))

        sigA = signTx(tx, privateKeyA, escrow.lockingScript, amount);
        sigE = signTx(tx, privateKeyE, escrow.lockingScript, amount);

        break;
      case 3:
        tx.addOutput(new bsv.Transaction.Output({
          script: bsv.Script.buildPublicKeyHashOut(privateKeyB.toAddress()),
          satoshis: amount ,
        }))

        sigB = signTx(tx, privateKeyB, escrow.lockingScript, amount);
        sigE = signTx(tx, privateKeyE, escrow.lockingScript, amount);

        break;
    }
    
    preimage = getPreimage(
      tx,
      escrow.lockingScript,
      inputSatoshis,
      0,
      Signature.ANYONECANPAY_ALL
    );

    // set txContext for verification
    escrow.txContext = {
      tx,
      inputIndex,
      inputSatoshis
    };
  });

  switch(scenario) {
    case 1:
      it('should succeed when pushing right data for scenario 1: PA + PB', () => {
        result = escrow.unlock(
          SigHashPreimage(toHex(preimage)),
          PubKey(toHex(publicKeyA)),
          Sig(toHex(sigA)),
          PubKey(toHex(publicKeyB)),
          Sig(toHex(sigB)),
          Bytes(toHex('')),
          PubKeyHash(toHex(publicKeyHashChange)),
          1000n
        )
        .verify();
        expect(result.success, result.error).to.be.true;
      });

      it('should fail when pushing wrong preimage', () => {
        result = escrow.unlock(
          SigHashPreimage(toHex(preimage) + '01'),
          PubKey(toHex(publicKeyA)),
          Sig(toHex(sigA)),
          PubKey(toHex(publicKeyB)),
          Sig(toHex(sigB)),
          Bytes(toHex('')),
          PubKeyHash(toHex(publicKeyHashChange)),
          Int(amount / 2 - fee)
        )
        .verify();
        expect(result.success, result.error).to.be.false;
      });

      break;
    case 2:
      it('should succeed when pushing right data for scenario 2: PA + PE + Hash 1', () => {
        result = escrow.unlock(
          SigHashPreimage(toHex(preimage)),
          PubKey(toHex(publicKeyA)),
          Sig(toHex(sigA)),
          PubKey(toHex(publicKeyE)),
          Sig(toHex(sigE)),
          Bytes(toHex(secretBuf1)),
          PubKeyHash(toHex(publicKeyHashChange)),
          Int(amount - fee)
        )
        .verify();
        expect(result.success, result.error).to.be.true;
      });

      it('should fail when pushing wrong preimage', () => {
        result = escrow.unlock(
          new SigHashPreimage(toHex(preimage) + '01'),
          new PubKey(toHex(publicKeyA)),
          new Sig(toHex(sigA)),
          new PubKey(toHex(publicKeyE)),
          new Sig(toHex(sigE)),
          new Bytes(toHex(secretBuf1)),
          new PubKeyHash(toHex(publicKeyHashChange)),
          amount - fee
        )
        .verify();
        expect(result.success, result.error).to.be.false;
      });
      break;
    case 3:
      it('should succeed when pushing right data for scenario 3: PB + PE + Hash 2', () => {
        result = escrow.unlock(
          new SigHashPreimage(toHex(preimage)),
          new PubKey(toHex(publicKeyB)),
          new Sig(toHex(sigB)),
          new PubKey(toHex(publicKeyE)),
          new Sig(toHex(sigE)),
          new Bytes(toHex(secretBuf2)),
          new PubKeyHash(toHex(publicKeyHashChange)),
          amount - fee
        )
        .verify();
        expect(result.success, result.error).to.be.true;
      });

      it('should fail when pushing wrong preimage', () => {
        result = escrow.unlock(
          SigHashPreimage(toHex(preimage) + '01'),
          PubKey(toHex(publicKeyB)),
          Sig(toHex(sigB)),
          PubKey(toHex(publicKeyE)),
          Sig(toHex(sigE)),
          Bytes(toHex(secretBuf2)),
          PubKeyHash(toHex(publicKeyHashChange)),
          Int(amount - fee)
        )
        .verify();
        expect(result.success, result.error).to.be.false;
      });
      break;
  }
});
