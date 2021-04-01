const { expect } = require('chai');
const { buildContractClass, Bytes, signTx, bsv, Sig, SigHashPreimage, PubKey, toHex, getPreimage, Ripemd160 } = require('scryptlib');
const path = require('path');
const { existsSync, mkdirSync } = require('fs');
const { inputIndex, inputSatoshis, newTx, compileContract, DataLen } = require('../../helper');


const privateKey1 = new bsv.PrivateKey.fromRandom('testnet')
const publicKey1 = bsv.PublicKey.fromPrivateKey(privateKey1)

const privateKey2 = new bsv.PrivateKey.fromRandom('testnet')
const publicKey2 = bsv.PublicKey.fromPrivateKey(privateKey2)

const Tictactoe = buildContractClass(compileContract('tictactoe.scrypt'));

game = new Tictactoe(new PubKey(toHex(publicKey1)), new PubKey(toHex(publicKey2)));

let state = new Bytes('00000000000000000000').toASM();
game.setDataPart(state)

describe('Test sCrypt contract Tictactoe In Javascript', () => {
  let result, preimage, sig, prevLockingScript



  it('n = 0', () => {

    prevLockingScript = game.lockingScript.toASM();

    let newState = new Bytes('01010000000000000000').toASM();

    const tx = newTx();
    const newLockingScript = [game.codePart.toASM(), newState].join(' ');


    tx.addOutput(new bsv.Transaction.Output({
      script: bsv.Script.fromASM(newLockingScript),
      satoshis: 10000
    }))

    preimage = getPreimage(tx, prevLockingScript, inputSatoshis);

    sig = signTx(tx, privateKey1, prevLockingScript, inputSatoshis)

    const context = { tx, inputIndex, inputSatoshis }

    result = game.move(0, new Sig(toHex(sig)), 10000, preimage).verify(context)
    expect(result.success, result.error).to.be.true;

    game.setDataPart(newState)

  });


  it('n = 4', () => {
    prevLockingScript = game.lockingScript.toASM();
    let newState = new Bytes('00010000000200000000').toASM();
    const tx = newTx();
    const newLockingScript = [game.codePart.toASM(), newState].join(' ');


    tx.addOutput(new bsv.Transaction.Output({
      script: bsv.Script.fromASM(newLockingScript),
      satoshis: 10000
    }))

    preimage = getPreimage(tx, prevLockingScript, inputSatoshis);

    sig = signTx(tx, privateKey2, prevLockingScript, inputSatoshis)

    const context = { tx, inputIndex, inputSatoshis }

    result = game.move(4, new Sig(toHex(sig)), 10000, preimage).verify(context)
    expect(result.success, result.error).to.be.true;

    game.setDataPart(newState)

  });


  it('n = 1', () => {
    prevLockingScript = game.lockingScript.toASM();
    let newState = new Bytes('01010100000200000000').toASM();
    const tx = newTx();
    const newLockingScript = [game.codePart.toASM(), newState].join(' ');


    tx.addOutput(new bsv.Transaction.Output({
      script: bsv.Script.fromASM(newLockingScript),
      satoshis: 10000
    }))

    preimage = getPreimage(tx, prevLockingScript, inputSatoshis);

    sig = signTx(tx, privateKey1, prevLockingScript, inputSatoshis)

    const context = { tx, inputIndex, inputSatoshis }

    result = game.move(1, new Sig(toHex(sig)), 10000, preimage).verify(context)
    expect(result.success, result.error).to.be.true;

    game.setDataPart(newState)

  });


  it('n = 8', () => {
    prevLockingScript = game.lockingScript.toASM();
    let newState = new Bytes('00010100000200000002').toASM();
    const tx = newTx();
    const newLockingScript = [game.codePart.toASM(), newState].join(' ');


    tx.addOutput(new bsv.Transaction.Output({
      script: bsv.Script.fromASM(newLockingScript),
      satoshis: 10000
    }))

    preimage = getPreimage(tx, prevLockingScript, inputSatoshis);

    sig = signTx(tx, privateKey2, prevLockingScript, inputSatoshis)

    const context = { tx, inputIndex, inputSatoshis }

    result = game.move(8, new Sig(toHex(sig)), 10000, preimage).verify(context)
    expect(result.success, result.error).to.be.true;

    game.setDataPart(newState)

  });


  it('n = 2', () => {
    prevLockingScript = game.lockingScript.toASM();

    const tx = newTx();

    tx.addOutput(new bsv.Transaction.Output({
      script: bsv.Script.buildPublicKeyHashOut(privateKey1.toAddress()).toHex(),
      satoshis: 10000
    }))

    preimage = getPreimage(tx, prevLockingScript, inputSatoshis);

    sig = signTx(tx, privateKey1, prevLockingScript, inputSatoshis)

    const context = { tx, inputIndex, inputSatoshis }

    result = game.move(2, new Sig(toHex(sig)), 10000, preimage).verify(context)
    expect(result.success, result.error).to.be.true;

  });

});
