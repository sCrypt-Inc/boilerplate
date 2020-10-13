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

    // set initial state
    let state = {'counter': 11, 'bytes': '1234', 'flag': true}
    counter.setDataPart(state)
    
    // mutate state
    state.counter++
    state.bytes += 'ff'
    state.flag = !state.flag

    const newLockingScript = [counter.codePart.toASM(), serializeState(state)].join(' ')

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
  });

  it('should succeed when pushing right preimage & amount', () => {
    result = counter.mutate(new SigHashPreimage(toHex(preimage)), outputAmount).verify()
    expect(result.success, result.error).to.be.true
  });
});