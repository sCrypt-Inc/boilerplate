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

describe('Test sCrypt contract StateStruct In Javascript', () => {
  let stateStruct, preimage, result

  before(() => {
    const StateStruct = buildContractClass(compileContract('stateStruct.scrypt'))
    stateStruct = new StateStruct()

  });

  it('should succeed when pushing right preimage & amount', () => {
    // set initial state
    let state = {'counter': 11, 'buf': '1234', 'flag': true}
    stateStruct.setDataPart(state)

    // mutate state
    state.counter++
    state.buf += 'ffff'
    state.flag = !state.flag
    const newSerial = serializeState(state)
    const newLockingScript = [stateStruct.codePart.toASM(), newSerial].join(' ')

    // deserialize state from new locking script
    const newState = deserializeState(bsv.Script.fromASM(newLockingScript), state)
    expect(newState.counter).to.equal(12)
    expect(newState.buf).to.equal('1234ffff')
    expect(newState.flag).to.equal(false)

    tx.addOutput(new bsv.Transaction.Output({
      script: bsv.Script.fromASM(newLockingScript),
      satoshis: outputAmount
    }))

    preimage = getPreimage(tx, stateStruct.lockingScript, inputSatoshis)

    // set txContext for verification
    stateStruct.txContext = {
      tx,
      inputIndex,
      inputSatoshis
    }

    result = stateStruct.mutate(new SigHashPreimage(toHex(preimage)), outputAmount).verify()
    expect(result.success, result.error).to.be.true
  });
});