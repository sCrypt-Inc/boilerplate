/**
 * Testnet deployment for Escrow contract in JavaScript
 **/
const {
  bsv,
  buildContractClass,
  PubKey,
  getPreimage,
  Ripemd160,
  Sig,
  signTx,
  toHex,
  Sha256, 
  Bytes,
  SigHashPreimage,
} = require('scryptlib');

const {
  loadDesc,
  createLockingTx,
  sendTx,
  showError,
} = require('../helper');

const { privateKey } = require('../privateKey');

(async () => {
  // A: Alice, B: Bob, E: Escrow
  // scenario 1: PA + PB
  // scenario 2: PA + PE + Hash 1
  // scenario 3: PB + PE + Hash 2

  const scenario = 1;

  const privateKeyA = new bsv.PrivateKey.fromRandom('testnet');
  console.log(`Private key generated: '${privateKeyA.toWIF()}'`);
  const publicKeyA = privateKeyA.publicKey;
  const publicKeyHashA = bsv.crypto.Hash.sha256ripemd160(publicKeyA.toBuffer());
  
  const privateKeyB = new bsv.PrivateKey.fromRandom('testnet');
  console.log(`Private key generated: '${privateKeyB.toWIF()}'`);
  const publicKeyB = privateKeyB.publicKey;
  const publicKeyHashB = bsv.crypto.Hash.sha256ripemd160(publicKeyB.toBuffer());
  
  const privateKeyE = new bsv.PrivateKey.fromRandom('testnet');
  console.log(`Private key generated: '${privateKeyE.toWIF()}'`);
  const publicKeyE = privateKeyE.publicKey;
  const publicKeyHashE = bsv.crypto.Hash.sha256ripemd160(publicKeyE.toBuffer());
  
  const secretBuf1 = Buffer.from("abc");
  const hashSecret1 = bsv.crypto.Hash.sha256(secretBuf1);

  const secretBuf2 = Buffer.from("def");
  const hashSecret2 = bsv.crypto.Hash.sha256(secretBuf2);

  const fee = 1500;

  const amount = 10000;

  const inputIndex = 0;

  try {
    // initialize contract
    const Escrow = buildContractClass(loadDesc('escrow_desc.json'));
    const escrow = new Escrow(new Ripemd160(toHex(publicKeyHashA)), new Ripemd160(toHex(publicKeyHashB)), new Ripemd160(toHex(publicKeyHashE)), new Sha256(toHex(hashSecret1)), new Sha256(toHex(hashSecret2)), fee);

    // deploy contract on testnet
    const lockingTx = await createLockingTx(privateKey.toAddress(), amount, fee);
    lockingTx.outputs[0].setScript(escrow.lockingScript);
    lockingTx.sign(privateKey);

    let lockingTxid = await sendTx(lockingTx);
    console.log('funding txid:      ', lockingTxid);

    // call contract method on testnet
    let prevLockingScript = escrow.lockingScript.toASM();

    let unlockingTx, sigA, sigB, sigE, unlockingScript;

    unlockingTx = new bsv.Transaction();

    unlockingTx.addInput(
      new bsv.Transaction.Input({
        prevTxId: lockingTxid,
        outputIndex: inputIndex,
        script: new bsv.Script(), // placeholder
      }), 
      escrow.lockingScript, 
      amount
    );

    switch(scenario) {
      case 1:
        unlockingTx.addOutput(new bsv.Transaction.Output({
          script: bsv.Script.buildPublicKeyHashOut(privateKeyA.toAddress()),
          satoshis: amount / 2 - fee,
        }))

        unlockingTx.addOutput(new bsv.Transaction.Output({
          script: bsv.Script.buildPublicKeyHashOut(privateKeyB.toAddress()),
          satoshis: amount / 2 - fee,
        }))

        unlockingTx.fee(fee * 2);

        break;
      case 2:
        unlockingTx.addOutput(new bsv.Transaction.Output({
          script: bsv.Script.buildPublicKeyHashOut(privateKeyA.toAddress()),
          satoshis: amount - fee,
        }))

        unlockingTx.fee(fee)

        break;
      case 3:
        unlockingTx.addOutput(new bsv.Transaction.Output({
          script: bsv.Script.buildPublicKeyHashOut(privateKeyB.toAddress()),
          satoshis: amount - fee,
        }))

        unlockingTx.fee(fee)
  
        break;
    }
    
    const preimage = getPreimage(
      unlockingTx,
      prevLockingScript,
      amount
    );

    switch(scenario) {
      case 1:
        sigA = signTx(unlockingTx, privateKeyA, escrow.lockingScript.toASM(), amount);
        sigB = signTx(unlockingTx, privateKeyB, escrow.lockingScript.toASM(), amount);

        unlockingScript = escrow.unlock(
          new SigHashPreimage(toHex(preimage)),
          new PubKey(toHex(publicKeyA)),
          new Sig(toHex(sigA)),
          new PubKey(toHex(publicKeyB)),
          new Sig(toHex(sigB)),
          new Bytes(toHex(''))
        )
        .toScript();

        break;
      case 2:
        sigA = signTx(unlockingTx, privateKeyA, escrow.lockingScript.toASM(), amount);
        sigE = signTx(unlockingTx, privateKeyE, escrow.lockingScript.toASM(), amount);
    
        unlockingScript = escrow.unlock(
          new SigHashPreimage(toHex(preimage)),
          new PubKey(toHex(publicKeyA)),
          new Sig(toHex(sigA)),
          new PubKey(toHex(publicKeyE)),
          new Sig(toHex(sigE)),
          new Bytes(toHex(secretBuf1))
        )
        .toScript();

        break;
      case 3:
        sigB = signTx(unlockingTx, privateKeyB, escrow.lockingScript.toASM(), amount);
        sigE = signTx(unlockingTx, privateKeyE, escrow.lockingScript.toASM(), amount);
    
        unlockingScript = escrow.unlock(
          new SigHashPreimage(toHex(preimage)),
          new PubKey(toHex(publicKeyB)),
          new Sig(toHex(sigB)),
          new PubKey(toHex(publicKeyE)),
          new Sig(toHex(sigE)),
          new Bytes(toHex(secretBuf2))
        )
        .toScript();

        break;
    }

    unlockingTx.inputs[0].setScript(unlockingScript);

    const unlockingTxid = await sendTx(unlockingTx);
    console.log('unlocking txid:   ', unlockingTxid);

    console.log('Succeeded on testnet');
  } catch (error) {
    console.log('Failed on testnet');
    showError(error);
  }
})();
