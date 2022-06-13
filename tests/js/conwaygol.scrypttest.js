const { expect } = require('chai');
const { bsv, buildContractClass, getPreimage, toHex, num2bin, SigHashPreimage, Bytes } = require('scryptlib');

const {
  inputIndex,
  inputSatoshis,
  newTx,
  DataLen,
  compileContract
} = require('../../helper');

const tx = newTx();
const outputAmount = 222222

describe('Test sCrypt contract Conways GOL In Javascript', () => {
  let gol, preimage, result

  before(() => {
    const GameOfLife = buildContractClass(compileContract('conwaygol.scrypt'))

    // TODO: This is a dumb way to do it but easier to visualize
    // original board
    let board = [
      0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0,
      0, 1, 1, 1, 0, 0, 0,
      0, 0, 0, 1, 0, 0, 0,
      0, 1, 1, 1, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0
    ];
    gol = new GameOfLife(board)
    // new board
    let newBoard = [
      0, 0, 0, 0, 0, 0, 0,
      0, 0, 1, 0, 0, 0, 0,
      0, 0, 1, 1, 0, 0, 0,
      0, 0, 0, 0, 1, 0, 0,
      0, 0, 1, 1, 0, 0, 0,
      0, 0, 1, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0
    ]
    const newLockingScript = gol.getNewStateScript({
      board: newBoard
    })

    tx.addOutput(new bsv.Transaction.Output({
      script: newLockingScript,
      satoshis: outputAmount
    }))

    preimage = getPreimage(tx, gol.lockingScript, inputSatoshis)

    // set txContext for verification
    gol.txContext = {
      tx,
      inputIndex,
      inputSatoshis
    }
  });

  it('should succeed when pushing right preimage & amount', () => {
    result = gol.play(outputAmount, new SigHashPreimage(toHex(preimage))).verify()
    expect(result.success, result.error).to.be.true
  });

  it('should fail when pushing wrong preimage', () => {
    result = gol.play(outputAmount, new SigHashPreimage(toHex(preimage) + '01')).verify()
    expect(result.success, result.error).to.be.false
  });

  it('should fail when pushing wrong amount', () => {
    result = gol.play(outputAmount - 1, new SigHashPreimage(toHex(preimage))).verify()
    expect(result.success, result.error).to.be.false
  });
});
