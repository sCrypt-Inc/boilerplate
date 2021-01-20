const { expect } = require('chai');
const { bsv, buildContractClass, getPreimage, toHex, num2bin, SigHashPreimage } = require('scryptlib');

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
    gol = new GameOfLife()

    // set initial gol value
    // 00000000000000
    // 00000000000000
    // 00010101000000
    // 00000001000000
    // 00010101000000
    // 00000000000000
    // 00000000000000
    let row1 = '00000000000000'
    let row2 = '00000000000000'
    let row3 = '00010101000000'
    let row4 = '00000001000000'
    let row5 = '00010101000000'
    let row6 = '00000000000000'
    let row7 = '00000000000000'

    // new board results
    //            '00000000000000'
    let newRow2 = '00000100000000'
    let newRow3 = '00000101000000'
    let newRow4 = '00000000010000'
    let newRow5 = '00000101000000'
    let newRow6 = '00000100000000'
    //            '00000000000000'


    // TODO: This is a dumb way to do it but easier to visualize
    // original board
    let board = row1+row2+row3+row4+row5+row6+row7
    // new board
    let newBoard = row1+newRow2+newRow3+newRow4+newRow5+newRow6+row1
    gol.setDataPart(board)
    const newLockingScript = [gol.codePart.toASM(), newBoard].join(' ')

    tx.addOutput(new bsv.Transaction.Output({
      script: bsv.Script.fromASM(newLockingScript),
      satoshis: outputAmount
    }))

    preimage = getPreimage(tx, gol.lockingScript.toASM(), inputSatoshis)

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
