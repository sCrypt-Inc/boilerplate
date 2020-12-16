const { bsv, buildContractClass, getPreimage, toHex, num2bin, SigHashPreimage, signTx, Ripemd160, PubKey, Sig } = require("scryptlib");
const { DataLen, loadDesc, unlockP2PKHInput, createLockingTx, createPayByOthersTx, sendTx, showError } = require("../helper");
const { privateKey } = require("../privateKey");

(async () => {
  const privateKeyA = new bsv.PrivateKey.fromRandom("testnet");
  // const privateKeyA = new bsv.PrivateKey.fromWIF("");
  const publicKeyA = bsv.PublicKey.fromPrivateKey(privateKeyA);
  const playerApkh = bsv.crypto.Hash.sha256ripemd160(publicKeyA.toBuffer());

  const privateKeyB = new bsv.PrivateKey.fromRandom("testnet");
  // const privateKeyB = new bsv.PrivateKey.fromWIF("");
  const publicKeyB = bsv.PublicKey.fromPrivateKey(privateKeyB);
  const playerBpkh = bsv.crypto.Hash.sha256ripemd160(publicKeyB.toBuffer());

  const Signature = bsv.crypto.Signature;
  // Note: ANYONECANPAY
  const sighashType = Signature.SIGHASH_ANYONECANPAY | Signature.SIGHASH_ALL | Signature.SIGHASH_FORKID;

  const actionINIT = 0;
  const actionROCK = 1;
  const actionPAPER = 2;
  const actionSCISSORS = 3;

  const actionA = actionROCK;
  const actionB = actionPAPER;
  const playerAdata = bsv.crypto.Hash.sha256ripemd160(Buffer.from(num2bin(actionA, DataLen) + toHex(publicKeyA.toBuffer()), "hex"));

  const PubKeyHashLen = 20

  try {
    const RockPaperScissors = buildContractClass(loadDesc("rps_desc.json"));
    const rps = new RockPaperScissors();

    rps.setDataPart(toHex(playerAdata) + num2bin(0, PubKeyHashLen) + num2bin(actionINIT, DataLen));

    let initSatoshis = 100000;
    let followSatoshis = 50000;
    const FEE = 10000;
    let finishSatoshis = 50000;

    // lock fund to the script & player A start the game
    const lockingTx = await createLockingTx(privateKey.toAddress(), initSatoshis, FEE);
    lockingTx.outputs[0].setScript(rps.lockingScript);
    lockingTx.sign(privateKey);

    let lockingTxid = await sendTx(lockingTx);
    // let lockingTxid = lockingTx.id;
    let lockingTxHex = lockingTx.serialize();
    console.log("funding txid:      ", lockingTxid);
    console.log("funding txhex:     ", lockingTxHex);

    // player B follow the game
    const txFollow = await createPayByOthersTx(privateKeyB.toAddress());
    {
      txFollow.addInput(
        new bsv.Transaction.Input({
          prevTxId: lockingTxid,
          outputIndex: 0,
          script: "",
        }),
        rps.lockingScript,
        initSatoshis
      );

      const curInputIndex = txFollow.inputs.length - 1;

      lockingScript0 = [rps.codePart.toASM(), toHex(playerAdata) + toHex(playerBpkh) + num2bin(actionB, DataLen)].join(" ");
      txFollow.addOutput(
        new bsv.Transaction.Output({
          script: bsv.Script.fromASM(lockingScript0),
          satoshis: initSatoshis + followSatoshis,
        })
      );
      txFollow.change(privateKeyB.toAddress()).fee(FEE);

      const changeAmount = txFollow.inputAmount - FEE - initSatoshis - followSatoshis;

      const preimage = getPreimage(txFollow, rps.lockingScript.toASM(), initSatoshis, curInputIndex, sighashType);

      const unlockingScript = rps.follow(new SigHashPreimage(toHex(preimage)), actionB, new Ripemd160(toHex(playerBpkh)), changeAmount).toScript();

      // unlock other p2pkh inputs
      for (let i = 0; i < curInputIndex; i++) {
        unlockP2PKHInput(privateKeyB, txFollow, i, sighashType);
      }
      txFollow.inputs[curInputIndex].setScript(unlockingScript);
      let followTxid = await sendTx(txFollow);
      // let followTxid = txFollow.id;
      let followTxHex = txFollow.serialize();
      console.log("follow txid:       ", followTxid);
      console.log("follow txhex:       ", followTxHex);
    }

    rps.setDataPart(toHex(playerAdata) + toHex(playerBpkh) + num2bin(actionB, DataLen));
    // player A finish the game
    const txFinish = await createPayByOthersTx(privateKeyA.toAddress());
    {
      txFinish.addInput(
        new bsv.Transaction.Input({
          prevTxId: txFollow.id,
          outputIndex: 0,
          script: "",
        }),
        rps.lockingScript,
        initSatoshis + followSatoshis
      );

      const curInputIndex = txFinish.inputs.length - 1;

      // A lose
      const amountPlayerB = initSatoshis;
      const amountPlayerA = txFinish.inputAmount - FEE - amountPlayerB;

      txFinish.addOutput(
        new bsv.Transaction.Output({
          script: bsv.Script.buildPublicKeyHashOut(privateKeyA.toAddress()),
          satoshis: amountPlayerA,
        })
      );

      txFinish.addOutput(
        new bsv.Transaction.Output({
          script: bsv.Script.buildPublicKeyHashOut(privateKeyB.toAddress()),
          satoshis: amountPlayerB,
        })
      );

      const preimage = getPreimage(txFinish, rps.lockingScript.toASM(), initSatoshis + followSatoshis, curInputIndex, sighashType);
      const sig = signTx(txFinish, privateKeyA, rps.lockingScript.toASM(), initSatoshis + followSatoshis, curInputIndex, sighashType);
      const unlockingScript = rps.finish(new SigHashPreimage(toHex(preimage)), actionA,
          new Sig(toHex(sig)),
          new PubKey(toHex(publicKeyA)), amountPlayerA).toScript();

      // unlock other p2pkh inputs
      for (let i = 0; i < curInputIndex; i++) {
        unlockP2PKHInput(privateKeyA, txFinish, i, sighashType);
      }
      txFinish.inputs[curInputIndex].setScript(unlockingScript);
      let finishTxid = await sendTx(txFinish);
      // let finishTxid = txFinish.id;
      let finishTxHex = txFinish.serialize();
      console.log("finish txid:       ", finishTxid);
      console.log("finish txhex:       ", finishTxHex);
    }

    console.log("Succeeded on testnet");
  } catch (error) {
    console.log("Failed on testnet");
    showError(error);
  }
})();
