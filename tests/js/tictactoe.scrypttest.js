const { expect } = require('chai');
const { buildContractClass, Bytes, signTx, bsv, Sig, SigHashPreimage, PubKey, toHex, getPreimage } = require('scryptlib');
const { inputIndex, inputSatoshis, newTx, compileContract, DataLen } = require('../../helper');


const privateKey1 = new bsv.PrivateKey.fromRandom('testnet')
const publicKey1 = bsv.PublicKey.fromPrivateKey(privateKey1)

const privateKey2 = new bsv.PrivateKey.fromRandom('testnet')
const publicKey2 = bsv.PublicKey.fromPrivateKey(privateKey2)

const Tictactoe = buildContractClass(compileContract('tictactoe.scrypt'));

const game = new Tictactoe(new PubKey(toHex(publicKey1)), new PubKey(toHex(publicKey2)), true, new Bytes('000000000000000000'));


describe('Test sCrypt contract Tictactoe In Javascript', () => {
  let result, preimage, sig, prevLockingScript


  function run(n, newState) {
    
    const tx = newTx();
    const newLockingScript = game.getNewStateScript(newState);


    tx.addOutput(new bsv.Transaction.Output({
      script: newLockingScript,
      satoshis: 10000
    }))

    preimage = getPreimage(tx, game.lockingScript, inputSatoshis);

    sig = signTx(tx, !newState.is_alice_turn ? privateKey1 : privateKey2, game.lockingScript, inputSatoshis)

    const context = { tx, inputIndex, inputSatoshis }

    result = game.move(n, new Sig(toHex(sig)), 10000, preimage).verify(context)
    expect(result.success, result.error).to.be.true;

    //update state
    game.is_alice_turn = newState.is_alice_turn;
    game.board = newState.board;

  }

  it('n = 0', () => {
    run(0, {
      is_alice_turn: false,
      board: new Bytes('010000000000000000')
    });
  });


  it('n = 4', () => {
    run(4, {
      is_alice_turn: true,
      board: new Bytes('010000000200000000')
    });
  });


  it('n = 1', () => {

    run(1, {
      is_alice_turn: false,
      board: new Bytes('010100000200000000')
    });

  });


  it('n = 8', () => {
    run(8, {
      is_alice_turn: true,
      board: new Bytes('010100000200000002')
    });
  });


  it('n = 2', () => {

    const tx = newTx();

    tx.addOutput(new bsv.Transaction.Output({
      script: bsv.Script.buildPublicKeyHashOut(privateKey1.toAddress()).toHex(),
      satoshis: 10000
    }))

    preimage = getPreimage(tx, game.lockingScript, inputSatoshis);

    sig = signTx(tx, privateKey1, game.lockingScript, inputSatoshis)

    const context = { tx, inputIndex, inputSatoshis }

    result = game.move(2, new Sig(toHex(sig)), 10000, preimage).verify(context)
    expect(result.success, result.error).to.be.true;

  });

});
