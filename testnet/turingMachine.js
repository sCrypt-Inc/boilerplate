const { bsv, buildContractClass, getPreimage, toHex, num2bin, SigHashPreimage, Bytes, buildTypeClasses } = require('scryptlib');
const { loadDesc, createUnlockingTx, createLockingTx, sendTx, showError, anyOnePayforTx, unlockP2PKHInput, sleep } = require('../helper');
const { privateKey } = require('../privateKey');

// Note: ANYONECANPAY

  //Getting the code of the contract from the file. You can also compile a .scrypt file


  (async () => {
    try {
      console.log("This is a demo that bitcoin is actually turing complete using a turing machine")
      const Signature = bsv.crypto.Signature
      const sighashType = Signature.SIGHASH_ANYONECANPAY | Signature.SIGHASH_SINGLE | Signature.SIGHASH_FORKID;
      const result = loadDesc('turingMachine_debug_desc.json');
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
      //Each time you spend the utxo, 4000sats will be paid as fees

      // Create the funding tx
      const lockingTx = await createLockingTx(privateKey.toAddress(), amount, contract.lockingScript)
      lockingTx.sign(privateKey)
      let lockingTxid = await sendTx(lockingTx)
      console.log('Funding txid:   ', lockingTxid)



      for (step = 1; ; step++) {
        await sleep(6);
        console.log("")
        console.log("New iteration of the turing machine")

        let prevLockingScript = contract.lockingScript;

        const new_state = allStates[step];
        console.log("step =" + step + " New state: ", new_state.toJSON())

        //Building the new transaction
        const newLockingScript = new_state.toJSON().curState === "b'03'" ? bsv.Script.buildPublicKeyHashOut(privateKey.toAddress()) : contract.getNewStateScript({
          states: new_state
        });

        const unlockingTx = await createUnlockingTx(lockingTxid, amount, prevLockingScript, amount, newLockingScript)
        const preimage = getPreimage(unlockingTx, prevLockingScript, amount, 0, sighashType)
        const unlockingScript = contract.transit(new SigHashPreimage(toHex(preimage))).toScript()
        unlockingTx.inputs[0].setScript(unlockingScript)

        await anyOnePayforTx(unlockingTx, privateKey.toAddress());

        for (let i = 1; i < unlockingTx.inputs.length; i++) {
          unlockP2PKHInput(privateKey, unlockingTx, i, sighashType);
        }


        //Let's send it
        console.log("Sending a new transaction...")
        lockingTxid = await sendTx(unlockingTx)
        console.log('Tx #' + step + ' sent. Txid: ', lockingTxid)

        if (new_state.toJSON().curState === "b'03'") {
          console.log('tuirng machine enter accepted')
          break;
        }

        contract.states = new_state;

      }
      console.log("End of the experimentation. Bitcoin is turing complete...")
    } catch (error) {
      console.log('Something went wrong')
      showError(error)
    }
  })()
