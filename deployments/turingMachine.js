const { bsv, buildContractClass, getPreimage, toHex, num2bin, SigHashPreimage, serializeState } = require('scryptlib');
const { loadDesc, createUnlockingTx, createLockingTx, sendTx, showError  } = require('../helper');
const { privateKey } = require('../privateKey');

const STATE_A = '00';
const STATE_B = '01';
const STATE_C = '02';
const STATE_ACCEPT = '03';

const BLANK = '00';
const OPEN  = '01';
const CLOSE = '02';
const X     = '03';

const RIGHT = false;
const LEFT = true;

//Compute the new state from the old one
function newState(state) {
  // console.log("Computing new state of", state)
  // curState = state[2]
  // idx = state[0]
  // tape = state[1]
  // head = tape.substring(2*idx, 2*(idx+1))
  curState = state.curState
  idx = state.headPos
  tape = state.tape
  head = tape.substring(2*idx, 2*(idx+1))

  newCurState = null
  newTape = null
  newHead = null
  //newCurState
  /*
  {{STATE_A, OPEN},   {STATE_A, OPEN, RIGHT}},
  {{STATE_A, X},      {STATE_A, X, RIGHT}},
  {{STATE_A, CLOSE},  {STATE_B, X, LEFT}},
  {{STATE_A, BLANK},  {STATE_C, BLANK, LEFT}},
  */
  if (curState == STATE_A) {
    switch (head) {
      case OPEN:
        newCurState = [STATE_A, OPEN, RIGHT]
        break;
      case X:
        newCurState = [STATE_A, X, RIGHT]
        break;
      case CLOSE:
        newCurState = [STATE_B, X, LEFT]
        break;
      case BLANK:
        newCurState = [STATE_C, BLANK, LEFT]
        break;
    }
  }
  /*
  {{STATE_B, OPEN},   {STATE_A, X, RIGHT}},
  {{STATE_B, X},      {STATE_B, X, LEFT}},
  */
  if (curState == STATE_B) {
    switch (head) {
      case OPEN:
        newCurState = [STATE_A, X, RIGHT]
        break;
      case X:
        newCurState = [STATE_B, X, LEFT]
        break;
    }
  }
  /*
  {{STATE_C, X},      {STATE_C, X, LEFT}},
  {{STATE_C, BLANK},  {STATE_ACCEPT, BLANK, RIGHT}}
  */
  if (curState == STATE_C) {
    switch (head) {
      case X:
        newCurState = [STATE_C, X, LEFT]
        break;
      case BLANK:
        newCurState = [STATE_ACCEPT, BLANK, RIGHT]
        break;
    }
  }

  //newTape
  newTape = tape.substring(0, 2*idx) + newCurState[1] + tape.substring(2*(idx+1))
  //newHead
  newHead = idx
  newHead += newCurState[2] ? -1 : 1
  if (newHead < 0) {
    newTape = BLANK + newTape
    newHead = 0
  } else if (2*newHead >= newTape.length) {
    newTape = newTape + BLANK;
  }
  // return [newHead, newTape, newCurState[0]]
  return {'headPos': newHead, 'tape': newTape, 'curState': newCurState[0]}
}

(async() => {
  try {
    console.log("This is a demo that bitcoin is actually turing complete using a turing machine")
    //Getting the code of the contract from the file. You can also compile a .scrypt file
    const TuringMachine = buildContractClass(loadDesc('turingMachine_debug_desc.json'))
    const contract = new TuringMachine()

    // set initial state
    state = {'headPos': 0, 'tape': '0101020201020102', 'curState': '00'}
    // return
    contract.setDataPart(state)

    //This is the amount the utxo will hold
    let amount = 200000
    //Each time you spend the utxo, 4000sats will be paid as fees
    const FEE = 5000

    // Create the funding tx
    const lockingTx =  await createLockingTx(privateKey.toAddress(), amount, FEE)
    lockingTx.outputs[0].setScript(contract.lockingScript)
    lockingTx.sign(privateKey)
    let lockingTxid = await sendTx(lockingTx, FEE)
    console.log('Funding txid:   ', lockingTxid)

    for (step = 1; ; step++) {
      console.log("")
      console.log("New iteration of the turing machine")

      let prevLockingScript = contract.lockingScript.toASM();

      const new_state = newState(state);
      contract.setDataPart(serializeState(new_state));
      state = new_state;
      console.log("step =" + step + " New state: ", state)

      //Building the new transaction
      const newLockingScript = new_state.curState === '03'  ?  bsv.Script.buildPublicKeyHashOut(privateKey.toAddress()).toASM() : contract.lockingScript.toASM();

      const newAmount = amount - FEE
      const unlockingTx = await createUnlockingTx(lockingTxid, amount, prevLockingScript, newAmount, newLockingScript)
      const preimage = getPreimage(unlockingTx, prevLockingScript, amount)
      const unlockingScript = contract.transit(new SigHashPreimage(toHex(preimage)), newAmount).toScript()
      unlockingTx.inputs[0].setScript(unlockingScript)
      amount = newAmount

      //Let's send it
      console.log("Sending a new transaction...")
      lockingTxid = await sendTx(unlockingTx)
      console.log('Tx #' + step + ' sent. Txid: ', lockingTxid)

      if(new_state.curState === '03') {
        console.log('tuirng machine enter accepted')
        break;
      }
    }
    console.log("End of the experimentation. Bitcoin is turing complete...")
  } catch (error) {
    console.log('Something went wrong')
    showError(error)
  }
})()
