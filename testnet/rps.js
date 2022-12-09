const { bsv, buildContractClass, getPreimage, toHex, num2bin, SigHashPreimage, signTx, Ripemd160, PubKey, Sig } = require("scryptlib");
const { DataLen, loadDesc, deployContract,
  fetchUtxos, sendTx, showError, sleep } = require("../helper");
const { privateKey } = require("../privateKey");

(async () => {
  const privateKeyA = new bsv.PrivateKey.fromRandom("testnet");
  // const privateKeyA = new bsv.PrivateKey.fromWIF("");
  const publicKeyA = bsv.PublicKey.fromPrivateKey(privateKeyA);
  const playerApkh = bsv.crypto.Hash.sha256ripemd160(publicKeyA.toBuffer());

  const privateKeyB = privateKey
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
    const RockPaperScissors = buildContractClass(loadDesc("rps_debug_desc.json"));
    const rps = new RockPaperScissors();

    rps.setDataPart(toHex(playerAdata) + num2bin(0, PubKeyHashLen) + num2bin(actionINIT, DataLen));

    let amount = 10000;
    let followSatoshis = 5000;

    // deploy contract on testnet
    const lockingTx = await deployContract(rps, amount);
    console.log('locking txid:     ', lockingTx.id)
    await sleep(6)

    const txFollow = new bsv.Transaction();

    txFollow.addInputFromPrevTx(lockingTx)
      .from(await fetchUtxos(privateKey.toAddress()))
      .setOutput(0, (tx) => {
        // player B follow the game
        const newLockingScript = [rps.codePart.toASM(), toHex(playerAdata)
          + toHex(playerBpkh) + num2bin(actionB, DataLen)].join(" ");
        const newAmount = amount + followSatoshis;
        return new bsv.Transaction.Output({
          script: bsv.Script.fromASM(newLockingScript),
          satoshis: newAmount
        })
      })
      .change(privateKeyB.toAddress())
      .setInputScript(0, (tx, output) => {
        const preimage = getPreimage(tx, output.script, output.satoshis, 0, sighashType)

        return rps.follow(new SigHashPreimage(toHex(preimage)),
          actionB,
          new Ripemd160(toHex(playerBpkh)),
          tx.getChangeAmount()
        ).toScript()
      })
      .sign(privateKey)
      .seal()

    let followTxid = await sendTx(txFollow);
    console.log("follow txid: ", followTxid);

    // player A finish the game
    rps.setDataPart(toHex(playerAdata) + toHex(playerBpkh) + num2bin(actionB, DataLen));

    const txFinish = new bsv.Transaction();
    const newAmount = txFollow.outputs[0].satoshis;
    const amountPlayerB = amount;
    txFinish.addInputFromPrevTx(txFollow)
      .change(privateKeyA.toAddress())
      .setOutput(0, (tx) => {
        const amountPlayerA = newAmount - amountPlayerB - tx.getEstimateFee();
        return new bsv.Transaction.Output({
          script: bsv.Script.buildPublicKeyHashOut(privateKeyA.toAddress()),
          satoshis: amountPlayerA
        })
      })
      .setOutput(1, (tx) => {
        return new bsv.Transaction.Output({
          script: bsv.Script.buildPublicKeyHashOut(privateKeyB.toAddress()),
          satoshis: amountPlayerB,
        })
      })
      .setInputScript(0, (tx, output) => {
        const preimage = getPreimage(tx, output.script, output.satoshis, 0, sighashType)
        const sig = signTx(tx, privateKeyA, output.script, output.satoshis, 0, sighashType);
        const amountPlayerA = newAmount - amountPlayerB - tx.getEstimateFee();
        return rps.finish(new SigHashPreimage(toHex(preimage)), actionA,
          new Sig(toHex(sig)),
          new PubKey(toHex(publicKeyA)), amountPlayerA).toScript()
      })
      .sign(privateKey)
      .seal()
    let finishTxid = await sendTx(txFinish);
    console.log("finish txid: ", finishTxid);

    console.log("Succeeded on testnet");
  } catch (error) {
    console.log("Failed on testnet");
    showError(error);
  }
})();
