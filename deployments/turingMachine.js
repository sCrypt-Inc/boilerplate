const { bsv, buildContractClass, getPreimage, toHex, num2bin, SigHashPreimage, serializeState } = require('scryptlib');
const { loadDesc, createUnlockingTx, createLockingTx, sendTx, showError  } = require('../helper');
const { privateKey } = require('../privateKey');
const axios = require('axios');

//Convert the "state", to a sequence of bytes
function write(state) {
  return '0' + state[0] + state[1] + state[2]
}

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
  // if (newHead < 0) {
  //   newTape = BLANK + newTape
  //   newHead = 0
  // } else if (2*newHead >= newTape.length) {
  //   newTape = newTape + BLANK;
  // }
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
    state = {'headPos': 0, 'tape': '01010202', 'curState': '00'}

    // for (ii = 0; ii < 10; ii++) {
    //   state = newState(state)
    //   console.log(`${ii}: `, state)
    // }

    // return
    contract.setDataPart(state)

    //This is the amount the utxo will hold
    let amount = 120000
    //Each time you spend the utxo, 4000sats will be paid as fees
    const FEE = 10000

    // Create the funding tx
    const lockingTx =  await createLockingTx(privateKey.toAddress(), amount, FEE)
    lockingTx.outputs[0].setScript(contract.lockingScript)
    lockingTx.sign(privateKey)
    let lockingTxid = await sendTx(lockingTx, FEE)
    console.log('Funding txid:   ', lockingTxid)

/*
    for (ii = 0; ii < 10; ii++) {
      state = newState(state);
      console.log(state);
    }
*/

    for (ii = 0; ii < 3; ii++) {
      console.log("")
      console.log("New iteration of the turing machine")

      let prevLockingScript = contract.lockingScript.toASM();

      const new_state = newState(state);
      contract.setDataPart(serializeState(new_state));
      state = new_state;
      console.log("New state: ", state)

      //Building the new transaction
      const newLockingScript = contract.lockingScript.toASM();
      const newAmount = amount - FEE
      const unlockingTx = await createUnlockingTx(lockingTxid, amount, prevLockingScript, newAmount, newLockingScript)
      const preimage = getPreimage(unlockingTx, prevLockingScript, amount)
      const unlockingScript = contract.transit(new SigHashPreimage(toHex(preimage)), newAmount).toScript()
      unlockingTx.inputs[0].setScript(unlockingScript)
      amount = newAmount

      //Let's send it
      console.log("Sending a new transaction...")
      lockingTxid = await sendTx(unlockingTx)
      console.log('Tx #' + ii + ' sent. Txid: ', lockingTxid)

      //The transaction is now known by miners. We can ask them what it was
      //This is what we do here, ask them what's our transaction is, and we take the part after OP_RETURN to see what's the state of the rule101 thing
      //Of course it's "state", but just to show that I'm not lying it's on the blockchain in the script program
      //And script itself enforce that the next utxo will have the correct state, hence turing completness
      console.log("Asking api.whatsonchain.com for the transaction...")
      // const {data:outputHex} = await axios.get('https://api.whatsonchain.com/v1/bsv/test/tx/'+lockingTxid+'/hex')
      // const size = outputHex.length
      // const data = outputHex.substring(size - 2*N - 8, size - 8)
      // console.log("Here is the latest state : ", data)
      //Here is what to do if you want to check the state on the web version of whatsonchain
      //Go to https://test.whatsonchain.com (test is for testnet)
      //Copy/Paste a transaction id, for instance 3203e127e62388dae149d80119376186bbd3d50faa3c2fdf986d7d931e166199
      //These transactions have 1input 1output. Display them in script by clicking on "Script"
      //Scroll down, at the end you'll see : OP_RETURN 0101000100 --> This is our state !!
    }
    console.log("End of the experimentation. Bitcoin is turing complete...")
  } catch (error) {
    console.log('Something went wrong')
    showError(error)
  }
})()
