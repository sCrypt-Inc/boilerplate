const { expect } = require('chai');
const { bsv, buildContractClass, getPreimage, toHex, SigHashPreimage } = require('scryptlib');

const {
  inputIndex,
  inputSatoshis,
  newTx,
  compileContract
} = require('../../helper');

const tx = newTx();
const outputAmount = 222222

describe('Heavy: Test sCrypt contract Conways GOL In Javascript', () => {
  let gol, preimage, result

  before(() => {
    const GameOfLife = buildContractClass(compileContract('conwaygol.scrypt'))

    // TODO: This is a dumb way to do it but easier to visualize
    // original board
    let board = [
      0n, 0n, 0n, 0n, 0n, 0n, 0n,
      0n, 0n, 0n, 0n, 0n, 0n, 0n,
      0n, 1n, 1n, 1n, 0n, 0n, 0n,
      0n, 0n, 0n, 1n, 0n, 0n, 0n,
      0n, 1n, 1n, 1n, 0n, 0n, 0n,
      0n, 0n, 0n, 0n, 0n, 0n, 0n,
      0n, 0n, 0n, 0n, 0n, 0n, 0n
    ];
    gol = new GameOfLife(board)
    // new board
    let newBoard = [
      0n, 0n, 0n, 0n, 0n, 0n, 0n,
      0n, 0n, 1n, 0n, 0n, 0n, 0n,
      0n, 0n, 1n, 1n, 0n, 0n, 0n,
      0n, 0n, 0n, 0n, 1n, 0n, 0n,
      0n, 0n, 1n, 1n, 0n, 0n, 0n,
      0n, 0n, 1n, 0n, 0n, 0n, 0n,
      0n, 0n, 0n, 0n, 0n, 0n, 0n
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
    result = gol.play(BigInt(outputAmount), SigHashPreimage(toHex(preimage))).verify()
    expect(result.success, result.error).to.be.true
  });

  it('should fail when pushing wrong preimage', () => {
    result = gol.play(BigInt(outputAmount), SigHashPreimage(toHex(preimage) + '01')).verify()
    expect(result.success, result.error).to.be.false
  });

  it('should fail when pushing wrong amount', () => {
    result = gol.play(BigInt(outputAmount - 1), SigHashPreimage(toHex(preimage))).verify()
    expect(result.success, result.error).to.be.false
  });
});
