const { expect } = require('chai');
const { bsv, buildContractClass, getPreimage, toHex, serializeState, deserializeState, SigHashPreimage } = require('scryptlib');

const {
  inputIndex,
  inputSatoshis,
  newTx,
  compileContract
} = require('../../helper');

const tx = newTx();
const outputAmount = 222222

describe('Test sCrypt contract TuringMachine In Javascript', () => {
  let counter, preimage, result

  before(() => {
    const Counter = buildContractClass(compileContract('turingMachine.scrypt'))
    counter = new Counter()

  });

  it('should succeed when pushing right preimage & amount', () => {
    // set initial state
    // let state = {'headPos': 0, 'tape': '01010202', 'curState': '00'}
    let state = { headPos: 1, tape: '01030303', curState: '01' }
    counter.setDataPart(state)

    // mutate state
    // state.headPos++
    state = { headPos: 0, tape: '01030303', curState: '01' }
    // state.buf += 'ffff'
    // state.flag = !state.flag
    const newSerial = serializeState(state)

    const newLockingScript = [counter.codePart.toASM(), newSerial].join(' ')

    // deserialize state from new locking script
    const newState = deserializeState(bsv.Script.fromASM(newLockingScript), state)
    // expect(newState.headPos).to.equal(1)
    // expect(newState.buf).to.equal('1234ffff')
    // expect(newState.flag).to.equal(false)

    tx.addOutput(new bsv.Transaction.Output({
      script: bsv.Script.fromASM(newLockingScript),
      satoshis: outputAmount
    }))

    preimage = getPreimage(tx, counter.lockingScript.toASM(), inputSatoshis)

    // set txContext for verification
    counter.txContext = {
      tx,
      inputIndex,
      inputSatoshis
    }

    result = counter.transit(new SigHashPreimage(toHex(preimage)), outputAmount).verify()
    expect(result.success, result.error).to.be.true
  });
});

// 0:  { headPos: 1, tape: '01010202', curState: '00' }
// 1:  { headPos: 2, tape: '01010202', curState: '00' }
// 2:  { headPos: 1, tape: '01010302', curState: '01' }
// 3:  { headPos: 2, tape: '01030302', curState: '00' }
// 4:  { headPos: 3, tape: '01030302', curState: '00' }
// 5:  { headPos: 2, tape: '01030303', curState: '01' }
// 6:  { headPos: 1, tape: '01030303', curState: '01' }
// 7:  { headPos: 0, tape: '01030303', curState: '01' }
// 8:  { headPos: 1, tape: '03030303', curState: '00' }
// 9:  { headPos: 2, tape: '03030303', curState: '00' }