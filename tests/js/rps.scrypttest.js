const { expect } = require("chai");
const { bsv, buildContractClass, signTx, toHex, getPreimage, num2bin, PubKey, Ripemd160, SigHashPreimage, Sig } = require("scryptlib");
const { inputIndex, inputSatoshis, newTx, compileContract, DataLen, dummyTxId } = require("../../helper");

// make a copy since it will be mutated
var tx = newTx();

describe("Test sCrypt contract Rock Paper Scissors In Javascript", () => {
  let rps, lockingScriptCodePart;

  const privateKeyA = new bsv.PrivateKey.fromRandom("testnet");
  const publicKeyA = bsv.PublicKey.fromPrivateKey(privateKeyA);
  const publicKeyHashPlayerA = bsv.crypto.Hash.sha256ripemd160(publicKeyA.toBuffer());
  const privateKeyB = new bsv.PrivateKey.fromRandom("testnet");
  const publicKeyB = bsv.PublicKey.fromPrivateKey(privateKeyB);
  const publicKeyHashPlayerB = bsv.crypto.Hash.sha256ripemd160(publicKeyB.toBuffer());

  const playerAdata = bsv.crypto.Hash.sha256ripemd160(Buffer.from("01" + toHex(publicKeyA.toBuffer()), "hex"));

  const Signature = bsv.crypto.Signature;
  // Note: ANYONECANPAY
  const sighashType = Signature.SIGHASH_ANYONECANPAY | Signature.SIGHASH_ALL | Signature.SIGHASH_FORKID;

  const PubKeyHashLen = 20;

  const actionINIT = 0;
  const actionROCK = 1;
  const actionPAPER = 2;
  const actionSCISSORS = 3;

  before(() => {
    const RPS = buildContractClass(compileContract("rps.scrypt"));
    rps = new RPS();

    // code part
    lockingScriptCodePart = rps.codePart.toASM();
  });

  it("should succeed when playerB follow", () => {
    const testFollow = (playerBpkh, action, initAmount, inputAmount, outputAmount, changeAmount) => {
      rps.setDataPart(toHex(playerAdata) + num2bin(0, PubKeyHashLen) + num2bin(actionINIT, DataLen));

      tx = new bsv.Transaction();
      tx.addInput(
        new bsv.Transaction.Input({
          prevTxId: dummyTxId,
          outputIndex: 0,
          script: "",
        }),
        bsv.Script.fromASM(rps.lockingScript.toASM()),
        initAmount
      );

      tx.addInput(
        new bsv.Transaction.Input({
          prevTxId: dummyTxId,
          outputIndex: 1,
          script: "",
        }),
        bsv.Script.fromASM("OP_DUP OP_HASH160 05a24d44e37cae0f4e231514c3ad512d313b1416 OP_EQUALVERIFY OP_CHECKSIG"),
        inputAmount
      );

      const newLockingScript0 = [lockingScriptCodePart, toHex(playerAdata) + toHex(playerBpkh) + num2bin(action, DataLen)].join(" ");
      tx.addOutput(
        new bsv.Transaction.Output({
          script: bsv.Script.fromASM(newLockingScript0),
          satoshis: outputAmount,
        })
      );

      tx.addOutput(
        new bsv.Transaction.Output({
          script: bsv.Script.buildPublicKeyHashOut(publicKeyB),
          satoshis: changeAmount,
        })
      );

      rps.txContext = { tx, inputIndex, inputSatoshis: initAmount };
      const preimage = getPreimage(tx, rps.lockingScript.toASM(), initAmount, inputIndex, sighashType);

      return rps.follow(new SigHashPreimage(toHex(preimage)), action, new Ripemd160(toHex(playerBpkh)), changeAmount);
    };

    let initAmount = 100000;
    let inputAmount = 60000;
    let outputAmount = 150000;
    let changeAmount = 10000;

    result = testFollow(publicKeyHashPlayerB, actionPAPER, initAmount, inputAmount, outputAmount, changeAmount).verify();
    expect(result.success, result.error).to.be.true;
  });

  it("should succeed when playerA finish", () => {
    const testFinish = (privKey, playerBpkh, actionA, actionB, totalAmount, inputAmount, outputAmount, changeAmount) => {
      rps.setDataPart(toHex(playerAdata) + toHex(playerBpkh) + num2bin(actionB, DataLen));

      tx = new bsv.Transaction();

      tx.addInput(
        new bsv.Transaction.Input({
          prevTxId: dummyTxId,
          outputIndex: 0,
          script: "",
        }),
        bsv.Script.fromASM(rps.lockingScript.toASM()),
        totalAmount
      );

      tx.addInput(
        new bsv.Transaction.Input({
          prevTxId: dummyTxId,
          outputIndex: 1,
          script: "",
        }),
        bsv.Script.fromASM("OP_DUP OP_HASH160 05a24d44e37cae0f4e231514c3ad512d313b1416 OP_EQUALVERIFY OP_CHECKSIG"),
        inputAmount
      );

      tx.addOutput(
        new bsv.Transaction.Output({
          script: bsv.Script.buildPublicKeyHashOut(publicKeyA),
          satoshis: changeAmount,
        })
      );

      if (outputAmount > 0) {
        tx.addOutput(
          new bsv.Transaction.Output({
            script: bsv.Script.buildPublicKeyHashOut(publicKeyB),
            satoshis: outputAmount,
          })
        );
      }
      rps.txContext = { tx, inputIndex, inputSatoshis: totalAmount };

      const preimage = getPreimage(tx, rps.lockingScript.toASM(), totalAmount, inputIndex, sighashType);
      const sig = signTx(tx, privKey, rps.lockingScript.toASM(), totalAmount, inputIndex, sighashType);

      return rps.finish(new SigHashPreimage(toHex(preimage)), actionA, new Sig(toHex(sig)), new PubKey(toHex(publicKeyA)), changeAmount);
    };

    let totalAmount = 150000;
    let inputAmount = 10000;
    let outputAmount = 100000;
    let changeAmount = 60000;
    /* lose */
    result = testFinish(privateKeyA, publicKeyHashPlayerB, actionROCK, actionPAPER, totalAmount, inputAmount, outputAmount, changeAmount).verify();
    expect(result.success, result.error).to.be.true;

    /* playerA can't change action*/
    result = testFinish(privateKeyA, publicKeyHashPlayerB, actionPAPER, actionPAPER, totalAmount, inputAmount, outputAmount, changeAmount).verify();
    expect(result.success, result.error).to.be.false;

    totalAmount = 150000;
    inputAmount = 10000;
    outputAmount = 0;
    changeAmount = 160000;
    /* win */
    result = testFinish(privateKeyA, publicKeyHashPlayerB, actionROCK, actionSCISSORS, totalAmount, inputAmount, outputAmount, changeAmount).verify();
    expect(result.success, result.error).to.be.true;

    totalAmount = 150000;
    inputAmount = 10000;
    outputAmount = 50000;
    changeAmount = 110000;
    /* draw */
    result = testFinish(privateKeyA, publicKeyHashPlayerB, actionROCK, actionROCK, totalAmount, inputAmount, outputAmount, changeAmount).verify();
    expect(result.success, result.error).to.be.true;
  });
});
