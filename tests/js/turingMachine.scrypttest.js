const { expect } = require('chai');
const { bsv, buildContractClass, getPreimage, toHex, serializeState, deserializeState, SigHashPreimage, buildTypeClasses, Bytes } = require('scryptlib');

const {
  inputIndex,
  inputSatoshis,
  newTx,
  compileContract
} = require('../../helper');

const outputAmount = inputSatoshis

const Signature = bsv.crypto.Signature
// Note: ANYONECANPAY
const sighashType = Signature.SIGHASH_ANYONECANPAY | Signature.SIGHASH_SINGLE | Signature.SIGHASH_FORKID


describe('Test sCrypt contract TuringMachine In Javascript', () => {
  let turingMachine, preimage, result

  let allStates;

  before(() => {
    const result = compileContract('turingMachine.scrypt');
    const TuringMachine = buildContractClass(result);

    allStates = [

      {
        'headPos': 0,
        'tape': Bytes('01010202'),
        'curState': Bytes('00')
      },

      {
        'headPos': 1,
        'tape': Bytes('01010202'),
        'curState': Bytes('00')
      },

      {
        'headPos': 2,
        'tape': Bytes('01010202'),
        'curState': Bytes('00')
      },

      {
        'headPos': 1,
        'tape': Bytes('01010302'),
        'curState': Bytes('01')
      },

      {
        'headPos': 2,
        'tape': Bytes('01030302'),
        'curState': Bytes('00')
      },

      {
        'headPos': 3,
        'tape': Bytes('01030302'),
        'curState': Bytes('00')
      },

      {
        'headPos': 2,
        'tape': Bytes('01030303'),
        'curState': Bytes('01')
      },

      {
        'headPos': 1,
        'tape': Bytes('01030303'),
        'curState': Bytes('01')
      },

      {
        'headPos': 0,
        'tape': Bytes('01030303'),
        'curState': Bytes('01')
      },

      {
        'headPos': 1,
        'tape': Bytes('03030303'),
        'curState': Bytes('00')
      },

      {
        'headPos': 2,
        'tape': Bytes('03030303'),
        'curState': Bytes('00')
      },

      {
        'headPos': 3,
        'tape': Bytes('03030303'),
        'curState': Bytes('00')
      },

      {
        'headPos': 4,
        'tape': Bytes('0303030300'),
        'curState': Bytes('00')
      },

      {
        'headPos': 3,
        'tape': Bytes('0303030300'),
        'curState': Bytes('02')
      },

      {
        'headPos': 2,
        'tape': Bytes('0303030300'),
        'curState': Bytes('02')
      },

      {
        'headPos': 1,
        'tape': Bytes('0303030300'),
        'curState': Bytes('02')
      },

      {
        'headPos': 0,
        'tape': Bytes('0303030300'),
        'curState': Bytes('02')
      },

      {
        'headPos': 0,
        'tape': Bytes('000303030300'),
        'curState': Bytes('02')
      },

      {
        'headPos': 0,
        'tape': Bytes('000303030300'),
        'curState': Bytes('03')
      },

    ]

    turingMachine = new TuringMachine(allStates[0])

  });


  function run(curState, newState) {
    const tx = newTx();

    turingMachine.states = curState;

    const newLockingScript = turingMachine.getNewStateScript({
      states: newState
    });

    tx.addOutput(new bsv.Transaction.Output({
      script: newLockingScript,
      satoshis: outputAmount
    }))


    preimage = getPreimage(tx, turingMachine.lockingScript, inputSatoshis, 0, Signature.ANYONECANPAY_SINGLE)

    // set txContext for verification
    turingMachine.txContext = {
      tx,
      inputIndex,
      inputSatoshis
    }

    result = turingMachine.transit(SigHashPreimage(toHex(preimage))).verify()
    expect(result.success, result.error).to.be.true

  }
  it('run', () => {

    for (let step = 0; step < 18; step++) {
      run(allStates[step], allStates[step + 1]);
    }
  });

});
