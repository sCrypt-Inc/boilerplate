const { bsv, buildContractClass, getPreimage, toHex, num2bin, SigHashPreimage, Bytes, buildTypeClasses } = require('scryptlib');
const { compileContract, deployContract, createInputFromPrevTx, sendTx, showError, sleep, fetchUtxos } = require('../helper');
const { privateKey } = require('../privateKey');

// Note: ANYONECANPAY

//Getting the code of the contract from the file. You can also compile a .scrypt file


(async () => {
  try {
    console.log("This is a demo that bitcoin is actually turing complete using a turing machine")
    const Signature = bsv.crypto.Signature
    const sighashType = Signature.SIGHASH_ANYONECANPAY | Signature.SIGHASH_SINGLE | Signature.SIGHASH_FORKID;
    const result = compileContract('turingMachine.scrypt');
    const TuringMachine = buildContractClass(result);

    const { StateStruct } = buildTypeClasses(result);

    let allStates = [

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

    const contract = new TuringMachine(allStates[0])

    //This is the amount the utxo will hold
    let amount = 2000

    // deploy contract on testnet
    const lockingTx = await deployContract(contract, amount);
    console.log('locking txid:     ', lockingTx.id)


    let prevTx = lockingTx;
    for (step = 1; ; step++) {
      await sleep(6);
      console.log("")
      console.log("New iteration of the turing machine")

      const new_state = allStates[step];
      console.log("step =" + step + " New state: ", new_state.toJSON())

      const unlockingTx = new bsv.Transaction();
      //Building the new transaction
      unlockingTx.addInput(createInputFromPrevTx(prevTx))
        .setOutput(0, (tx) => {

          const newLockingScript = new_state.toJSON().curState === "b'03'" ? bsv.Script.buildPublicKeyHashOut(privateKey.toAddress()) : contract.getNewStateScript({
            states: new_state
          });

          return new bsv.Transaction.Output({
            script: newLockingScript,
            satoshis: amount,
          })
        })
        .setInputScript(0, (tx, output) => {
          const preimage = getPreimage(tx, output.script, output.satoshis, 0, sighashType)
          return contract.transit(new SigHashPreimage(toHex(preimage))).toScript()
        })
        .from(await fetchUtxos(privateKey.toAddress()))
        .change(privateKey.toAddress())
        .sign(privateKey)
        .seal()

      //Let's send it
      console.log("Sending a new transaction...")
      await sendTx(unlockingTx)
      console.log('Tx #' + step + ' sent. Txid: ', unlockingTx.id)

      if (new_state.toJSON().curState === "b'03'") {
        console.log('tuirng machine enter accepted')
        break;
      }

      contract.states = new_state;
      prevTx = unlockingTx;

    }
    console.log("End of the experimentation. Bitcoin is turing complete...")
  } catch (error) {
    console.log('Something went wrong')
    showError(error)
  }
})()
