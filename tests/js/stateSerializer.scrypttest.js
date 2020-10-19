const { expect } = require('chai');
const { bsv, buildContractClass, getPreimage, toHex, serializeState, SigHashPreimage } = require('scryptlib');

const {
  inputIndex,
  inputSatoshis,
  tx,
  compileContract
} = require('../../helper');

// make a copy since it will be mutated
const tx_ = bsv.Transaction.shallowCopy(tx)
const outputAmount = 222222

describe('Test sCrypt contract StateSerializer In Javascript', () => {
  let counter, preimage, result

  before(() => {
    const Counter = buildContractClass(compileContract('stateSerializer.scrypt'))
    counter = new Counter()

  });

  it('should succeed when pushing right preimage & amount', () => {
    // set initial state
    // let state = {'counter': 11, 'bytes': '1234', 'flag': true}
    let state =[ 0, -1, 11, '1234', true]
    counter.setDataPart(state)
    console.log(counter.dataPart.toASM())

    // console.log(counter.lockingScript.toASM())
    // console.log(counter.lockingScript.toHex())
    
    // mutate state
    state[2] = state[2] + 1
    state[3] = state[3] + 'ff'
    state[4] = !state[4]
    state[5] = 'ff'.repeat(2)

    // state.counter ++
    // state.bytes += 'ff'
    // state.flag = !state.flag

    const newSerial = serializeState(state.slice(2))
    console.log(newSerial)

    const newLockingScript = [counter.codePart.toASM(), newSerial].join(' ')

    console.log(newLockingScript)
    console.log(bsv.Script.fromASM(newLockingScript).toHex())

    tx_.addOutput(new bsv.Transaction.Output({
      script: bsv.Script.fromASM(newLockingScript),
      satoshis: outputAmount
    }))

    preimage = getPreimage(tx_, counter.lockingScript.toASM(), inputSatoshis)

    // set txContext for verification
    counter.txContext = {
      tx: tx_,
      inputIndex,
      inputSatoshis
    }

    result = counter.mutate(new SigHashPreimage(toHex(preimage)), outputAmount).verify()
    expect(result.success, result.error).to.be.true
  });
});