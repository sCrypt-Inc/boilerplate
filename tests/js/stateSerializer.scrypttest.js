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

describe('Test sCrypt contract StateSerializer In Javascript', () => {
  let counter, preimage, result

  before(() => {
    const Counter = buildContractClass(compileContract('stateSerializer.scrypt'))
    counter = new Counter()

  });

  it('should succeed when pushing right preimage & amount', () => {
    // set initial state
    let state = {'counter': 11, 'buf': '1234', 'flag': true}
    counter.setDataPart(state)

    // mutate state
    state.counter++
    state.buf += 'ffff'
    state.flag = !state.flag
    const newSerial = serializeState(state)

    const newLockingScript = [counter.codePart.toASM(), newSerial].join(' ')

    // deserialize state from new locking script
    const newState = deserializeState(bsv.Script.fromASM(newLockingScript), state)
    expect(newState.counter).to.equal(12)
    expect(newState.buf).to.equal('1234ffff')
    expect(newState.flag).to.equal(false)

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

    result = counter.mutate(new SigHashPreimage(toHex(preimage)), outputAmount).verify()
    expect(result.success, result.error).to.be.true
  });
});