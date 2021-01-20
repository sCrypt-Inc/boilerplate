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
    let state =[ 0, -1, 11, '1234', true]
    counter.setDataPart(state)
    
    // mutate state
    state[2] = state[2] + 1
    state[3] = state[3] + 'ff'
    state[4] = !state[4]
    state[5] = 'ff'.repeat(2)
    const newSerial = serializeState(state.slice(2))

    // object literal is also allowed.
    // let state = {'zero': 0, 'neg': -1, 'counter': 11, 'bytes': '1234', 'flag': true}
    // counter.setDataPart(state)
    // state.counter ++
    // state.bytes += 'ff'
    // state.flag = !state.flag
    // state.ext = 'ff'.repeat(2)
    // delete state.zero
    // delete state.neg
    // const newSerial = serializeState(state)

    const newLockingScript = [counter.codePart.toASM(), newSerial].join(' ')

    // deserialize Locking Script Hex
    // const deStats = deserializeState(bsv.Script.fromASM(newLockingScript))
    // console.log(deStats[0].toNumber())
    // console.log(deStats[1].toBigInt())
    // console.log(deStats[2].toBoolean())
    // console.log(deStats[3].toHex())

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