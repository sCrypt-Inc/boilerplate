const { expect } = require('chai');
const { bsv, buildContractClass, getPreimage, toHex, serializeState, deserializeState, SigHashPreimage, buildTypeClasses, Bytes } = require('scryptlib');

const {
  inputIndex,
  inputSatoshis,
  newTx,
  compileContract
} = require('../../helper');

const outputAmount = 222222

describe('Test sCrypt contract TuringMachine In Javascript', () => {
  let turingMachine, preimage, result

  let allStates;

  before(() => {
    const result = compileContract('turingMachine.scrypt');
    const TuringMachine = buildContractClass(result);

    const { StateStruct } = buildTypeClasses(result);

    allStates = [

      new StateStruct({
        'headPos': 0,
        'tape': new Bytes('01010202'),
        'curState': new Bytes('00')
      }),

      new StateStruct({
        'headPos': 1,
        'tape': new Bytes('01010202'),
        'curState': new Bytes('00')
      }),

      new StateStruct({
        'headPos': 2,
        'tape': new Bytes('01010202'),
        'curState': new Bytes('00')
      }),

      new StateStruct({
        'headPos': 1,
        'tape': new Bytes('01010302'),
        'curState': new Bytes('01')
      }),

      new StateStruct({
        'headPos': 2,
        'tape': new Bytes('01030302'),
        'curState': new Bytes('00')
      }),

      new StateStruct({
        'headPos': 3,
        'tape': new Bytes('01030302'),
        'curState': new Bytes('00')
      }),

      new StateStruct({
        'headPos': 2,
        'tape': new Bytes('01030303'),
        'curState': new Bytes('01')
      }),

      new StateStruct({
        'headPos': 1,
        'tape': new Bytes('01030303'),
        'curState': new Bytes('01')
      }),

      new StateStruct({
        'headPos': 0,
        'tape': new Bytes('01030303'),
        'curState': new Bytes('01')
      }),

      new StateStruct({
        'headPos': 1,
        'tape': new Bytes('03030303'),
        'curState': new Bytes('00')
      }),

      new StateStruct({
        'headPos': 2,
        'tape': new Bytes('03030303'),
        'curState': new Bytes('00')
      }),

      new StateStruct({
        'headPos': 3,
        'tape': new Bytes('03030303'),
        'curState': new Bytes('00')
      }),

      new StateStruct({
        'headPos': 4,
        'tape': new Bytes('0303030300'),
        'curState': new Bytes('00')
      }),

      new StateStruct({
        'headPos': 3,
        'tape': new Bytes('0303030300'),
        'curState': new Bytes('02')
      }),

      new StateStruct({
        'headPos': 2,
        'tape': new Bytes('0303030300'),
        'curState': new Bytes('02')
      }),

      new StateStruct({
        'headPos': 1,
        'tape': new Bytes('0303030300'),
        'curState': new Bytes('02')
      }),

      new StateStruct({
        'headPos': 0,
        'tape': new Bytes('0303030300'),
        'curState': new Bytes('02')
      }),

      new StateStruct({
        'headPos': 0,
        'tape': new Bytes('000303030300'),
        'curState': new Bytes('02')
      }),

      new StateStruct({
        'headPos': 0,
        'tape': new Bytes('000303030300'),
        'curState': new Bytes('03')
      }),

    ]

    turingMachine = new TuringMachine(allStates[0])

  });


  function run(curState, newState) {
    const tx = newTx();

    turingMachine.states = curState;

    const newLockingScript = turingMachine.getStateScript({
      states: newState
    });

    tx.addOutput(new bsv.Transaction.Output({
      script: newLockingScript,
      satoshis: outputAmount
    }))


    preimage = getPreimage(tx, turingMachine.lockingScript, inputSatoshis)

    // set txContext for verification
    turingMachine.txContext = {
      tx,
      inputIndex,
      inputSatoshis
    }

    result = turingMachine.transit(new SigHashPreimage(toHex(preimage)), outputAmount).verify()
    expect(result.success, result.error).to.be.true

  }
  it('run', () => {

    for (let step = 0; step < 18; step++) {
      run(allStates[step], allStates[step + 1]);
    }
  });

});
