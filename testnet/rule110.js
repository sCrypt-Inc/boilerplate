const { bsv, buildContractClass, getPreimage, toHex, num2bin, SigHashPreimage, Bytes } = require('scryptlib');
const { loadDesc, deployContract, createInputFromPrevTx, sendTx, showError } = require('../helper');
const { privateKey } = require('../privateKey');
const axios = require('axios');

const Signature = bsv.crypto.Signature
const sighashType = Signature.SIGHASH_ANYONECANPAY | Signature.SIGHASH_SINGLE | Signature.SIGHASH_FORKID


//Convert the "state", to a sequence of bytes
function write(state) {
  res = "";
  for (i = 0; i < N; i++) {
    if (!state[i]) {
      res += num2bin(0, 1);
    }
    else {
      res += num2bin(1, 1);
    }
  }
  return res;
}

//Compute the new state from the old one
function newState(state) {
  new_state = []
  new_state.push(false)
  for (i = 1; i < N - 1; i++) {
    newElem = true;
    left = state[i - 1];
    middle = state[i];
    right = state[i + 1];
    if (left && middle && right) {
      newElem = false;
    }
    if (left && !middle && !right) {
      newElem = false;
    }
    if (!left && !middle && !right) {
      newElem = false;
    }
    new_state.push(newElem);
  }
  new_state.push(false);
  return new_state;
}

(async () => {
  try {
    console.log("Hello !")
    console.log("This is a demo that bitcoin is actually turing complete using rule101 : https://en.wikipedia.org/wiki/Rule_110")
    console.log("It's a bit like the game of life by conway")
    console.log("Make sure to check the index.js file ! Enjoy :)")
    console.log("")
    //Getting the code of the contract from the file. You can also compile a .scrypt file
    const Rule101 = buildContractClass(loadDesc('rule110_debug_desc.json'))


    //Parameters. Here playing rule101 with N=5, and the begin state 11010
    N = 5
    state = [true, true, false, true, false]
    //State is kept as raw bytes after OP_RETURN. So the transaction is somthing like "OP_...... OP_RETURN 0101000100", where 01 is true, and 00 is false
    //We could compress, but here one booleans take one byte
    const contract = new Rule101(new Bytes(write(state)));

    //This is the amount the utxo will hold
    let amount = 15000


    // deploy contract on testnet
    const lockingTx = await deployContract(contract, amount);
    console.log('locking txid:     ', lockingTx.id)

    let prevTx = lockingTx;

    //Now we will spend the utxo
    //This utxo can only be spent if the new utxo has a locking script which is "OP_...... OP_RETURN newstate"
    //Each transaction will update the state of the rule101 game
    //This game, just like the game of life, is turing complete so it's ok
    //(You can find the game of life here : https://github.com/sCrypt-Inc/boilerplate/blob/master/contracts/conwaygol.scrypt)
    for (ii = 0; ii < 5; ii++) {

      //Computing the new state for rule101, and updating the OP_RETURN part
      //Note that if you try to uncomment this modification, then next utxo will be "OP_...... OP_RETURN oldstate"
      //And it won't be accepted by miners, because the verification that you sent the new state is written in script
      const new_state = newState(state);

      //Building the new transaction
      const newLockingScript = contract.getNewStateScript({
        board: new Bytes(write(new_state))
      });

      state = new_state;

      const unlockingTx = new bsv.Transaction();

      unlockingTx.addInput(createInputFromPrevTx(prevTx))
        .setOutput(0, (tx) => {
          return new bsv.Transaction.Output({
            script: newLockingScript,
            satoshis: amount - tx.getEstimateFee(),
          })
        })
        .setInputScript(0, (tx, output) => {
          const preimage = getPreimage(tx, output.script, output.satoshis, 0, sighashType)
          const newAmount = unlockingTx.outputs[0].satoshis;
          return contract.play(newAmount, new SigHashPreimage(toHex(preimage))).toScript()
        })
        .seal()
      //Let's send it
      console.log("Sending a new transaction...")
      lockingTxid = await sendTx(unlockingTx)
      console.log('Tx #' + ii + ' sent. Txid: ', lockingTxid)


      amount = unlockingTx.outputs[0].satoshis

      contract.board = new Bytes(write(new_state));

      prevTx = unlockingTx

      //The transaction is now known by miners. We can ask them what it was
      //This is what we do here, ask them what's our transaction is, and we take the part after OP_RETURN to see what's the state of the rule101 thing
      //Of course it's "state", but just to show that I'm not lying it's on the blockchain in the script program
      //And script itself enforce that the next utxo will have the correct state, hence turing completness
      console.log("Asking api.whatsonchain.com for the transaction...")
      const { data: outputHex } = await axios.get('https://api.whatsonchain.com/v1/bsv/test/tx/' + lockingTxid + '/hex')
      const size = outputHex.length
      const data = outputHex.substring(size - 2 * N - 8, size - 8)
      console.log("Here is the latest state : ", data)
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
