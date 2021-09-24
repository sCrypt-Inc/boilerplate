const { expect } = require('chai');
const { bsv, buildContractClass, getPreimage, toHex, serializeState, deserializeState, SigHashPreimage } = require('scryptlib');

const {
  inputIndex,
  inputSatoshis,
  newTx,
  compileContract
} = require('../../helper');

const outputAmount = 222222

describe('Test sCrypt contract TuringMachine In Javascript', () => {
  let turingMachine, preimage, result

  before(() => {
    const TuringMachine = buildContractClass(compileContract('turingMachine.scrypt'))
    turingMachine = new TuringMachine()

  });


  function run(curState, newState) {
    const tx = newTx();
    const oldSerial = serializeState(curState)

    turingMachine.setDataPart(oldSerial)

    const newSerial = serializeState(newState)

    const newLockingScript = [turingMachine.codePart.toASM(), newSerial].join(' ');

    tx.addOutput(new bsv.Transaction.Output({
      script: bsv.Script.fromASM(newLockingScript),
      satoshis: outputAmount
    }))

    
    preimage = getPreimage(tx, turingMachine.lockingScript.toASM(), inputSatoshis)

    // set txContext for verification
    turingMachine.txContext = {
      tx,
      inputIndex,
      inputSatoshis
    }

    result = turingMachine.transit(new SigHashPreimage(toHex(preimage)), outputAmount).verify()
    expect(result.success, result.error).to.be.true

  }
  it('run step 1', () => {
    // set initial state
    let state = {'headPos': 0, 'tape': '01010202', 'curState': '00'};
    let newState = {'headPos': 1, 'tape': '01010202', 'curState': '00'}
    run(state, newState);
  });

  it('run step 2', () => {

    let state = {'headPos': 1, 'tape': '01010202', 'curState': '00'}
    let newState = {'headPos': 2, 'tape': '01010202', 'curState': '00'};
    run(state, newState);
  });


  it('run step 3', () => {

    let state = {'headPos': 2, 'tape': '01010202', 'curState': '00'};
    let newState = {'headPos': 1, 'tape': '01010302', 'curState': '01'}
    run(state, newState);
  });

  it('run step 4', () => {
    
    let state = {'headPos': 1, 'tape': '01010302', 'curState': '01'}
    let newState = {'headPos': 2, 'tape': '01030302', 'curState': '00'};
    run(state, newState);
  });

  it('run step 5', () => {
    
    let state = {'headPos': 2, 'tape': '01030302', 'curState': '00'};
    let newState = {'headPos': 3, 'tape': '01030302', 'curState': '00'};
    run(state, newState);
  });


  it('run step 6', () => {
  
    let state = {'headPos': 3, 'tape': '01030302', 'curState': '00'};
    let newState = {'headPos': 2, 'tape': '01030303', 'curState': '01'};
    run(state, newState);
  });

  it('run step 7', () => {
  
    let state = {'headPos': 2, 'tape': '01030303', 'curState': '01'};
    let newState = {'headPos': 1, 'tape': '01030303', 'curState': '01'};
    run(state, newState);
  });

  it('run step 8', () => {
  
    let state = {'headPos': 1, 'tape': '01030303', 'curState': '01'};
    let newState = {'headPos': 0, 'tape': '01030303', 'curState': '01'};
    run(state, newState);
  });

  it('run step 9', () => {
  
    let state = {'headPos': 0, 'tape': '01030303', 'curState': '01'};
    let newState = {'headPos': 1, 'tape': '03030303', 'curState': '00'};
    run(state, newState);
  });

  it('run step 10', () => {
  

    let state = {'headPos': 1, 'tape': '03030303', 'curState': '00'};
    let newState = {'headPos': 2, 'tape': '03030303', 'curState': '00'};
    run(state, newState);
  });

  it('run step 11', () => {
  
    let state = {'headPos': 2, 'tape': '03030303', 'curState': '00'};
    let newState = {'headPos': 3, 'tape': '03030303', 'curState': '00'};
    run(state, newState);
  });

  it('run step 12', () => {

    let state = {'headPos': 3, 'tape': '03030303', 'curState': '00'};
    let newState = {'headPos': 4, 'tape': '0303030300', 'curState': '00'};
    run(state, newState);
  });

  it('run step 13', () => {

    let state = {'headPos': 4, 'tape': '0303030300', 'curState': '00'};
    let newState = {'headPos': 3, 'tape': '0303030300', 'curState': '02'};
    run(state, newState);
  });

  it('run step 14', () => {
    let state = {'headPos': 3, 'tape': '0303030300', 'curState': '02'};
    let newState = {'headPos': 2, 'tape': '0303030300', 'curState': '02'};
    run(state, newState);
  });

  it('run step 15', () => {
    let state = {'headPos': 2, 'tape': '0303030300', 'curState': '02'};
    let newState = {'headPos': 1, 'tape': '0303030300', 'curState': '02'};
    run(state, newState);
  });

  it('run step 16', () => {
    let state = {'headPos': 1, 'tape': '0303030300', 'curState': '02'};
    let newState = {'headPos': 0, 'tape': '0303030300', 'curState': '02'};
    run(state, newState);
  });

  it('run step 17', () => {
    let state = {'headPos': 0, 'tape': '0303030300', 'curState': '02'};
    let newState = {'headPos': 0, 'tape': '000303030300', 'curState': '02'};
    run(state, newState);
  });

  it('run step 18', () => {
    let state = {'headPos': 0, 'tape': '000303030300', 'curState': '02'};
    let newState = {};
    run(state, newState);
  });
});
