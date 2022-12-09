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
  deployContract,
  fetchUtxos,
  sendTx,
  showError,
  sleep,
} = require('../helper');

const { privateKey } = require('../privateKey');



(async () => {

  const Signature = bsv.crypto.Signature
  const sighashType = Signature.SIGHASH_ANYONECANPAY | Signature.SIGHASH_ALL | Signature.SIGHASH_FORKID

  // A: Alice, B: Bob, E: Escrow
  // scenario 1: PA + PB
  // scenario 2: PA + PE + Hash 1
  // scenario 3: PB + PE + Hash 2

  const scenario = 1;

  const publicKey = privateKey.publicKey;
  const publicKeyHash = bsv.crypto.Hash.sha256ripemd160(publicKey.toBuffer());


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

  const amount = 1000;

  try {
    // initialize contract
    const Escrow = buildContractClass(loadDesc('escrow_debug_desc.json'));
    const escrow = new Escrow(new Ripemd160(toHex(publicKeyHashA)), new Ripemd160(toHex(publicKeyHashB)),
      new Ripemd160(toHex(publicKeyHashE)), new Sha256(toHex(hashSecret1)), new Sha256(toHex(hashSecret2)));

    // deploy contract on testnet
    const lockingTx = await deployContract(escrow, amount);
    console.log('locking txid:     ', lockingTx.id)

    await sleep(6)
    // call contract method on testnet
    const unlockingTx = new bsv.Transaction();



    switch (scenario) {
      case 1:
        unlockingTx.addInputFromPrevTx(lockingTx)
          .from(await fetchUtxos(privateKey.toAddress()))
          .addOutput(new bsv.Transaction.Output({
            script: bsv.Script.buildPublicKeyHashOut(privateKeyA.toAddress()),
            satoshis: amount / 2,
          }))
          .addOutput(new bsv.Transaction.Output({
            script: bsv.Script.buildPublicKeyHashOut(privateKeyB.toAddress()),
            satoshis: amount / 2,
          }))
          .change(privateKey.toAddress())
          .setInputScript(0, (tx, output) => {
            const preimage = getPreimage(
              tx,
              output.script,
              output.satoshis,
              0,
              sighashType
            );

            const sigA = signTx(tx, privateKeyA, escrow.lockingScript, amount);
            const sigB = signTx(tx, privateKeyB, escrow.lockingScript, amount);

            return escrow.unlock(
              new SigHashPreimage(toHex(preimage)),
              new PubKey(toHex(publicKeyA)),
              new Sig(toHex(sigA)),
              new PubKey(toHex(publicKeyB)),
              new Sig(toHex(sigB)),
              new Bytes(toHex('')),
              new Ripemd160(toHex(publicKeyHash)),
              tx.getChangeAmount()
            )
              .toScript();
          })
          .sign(privateKey)
          .seal()
          

        break;
      case 2:

        unlockingTx.addInput(lockingTx)
          .from(await fetchUtxos(privateKey.toAddress()))
          .addOutput(new bsv.Transaction.Output({
            script: bsv.Script.buildPublicKeyHashOut(privateKeyA.toAddress()),
            satoshis: amount,
          }))
          .change(privateKey.toAddress())
          .setInputScript(0, (tx, output) => {
            const preimage = getPreimage(
              tx,
              output.script,
              output.satoshis,
              0,
              sighashType
            );

            const sigA = signTx(unlockingTx, privateKeyA, escrow.lockingScript, amount);
            const sigE = signTx(unlockingTx, privateKeyE, escrow.lockingScript, amount);

            return escrow.unlock(
              new SigHashPreimage(toHex(preimage)),
              new PubKey(toHex(publicKeyA)),
              new Sig(toHex(sigA)),
              new PubKey(toHex(publicKeyE)),
              new Sig(toHex(sigE)),
              new Bytes(toHex(secretBuf1)),
              new Ripemd160(toHex(publicKeyHash)),
              tx.getChangeAmount()
            )
              .toScript();
          })
          .sign(privateKey)
          .seal()
          

        break;
      case 3:

        unlockingTx.addInputFromPrevTx(lockingTx)
          .from(await fetchUtxos(privateKey.toAddress()))
          .addOutput(new bsv.Transaction.Output({
            script: bsv.Script.buildPublicKeyHashOut(privateKeyB.toAddress()),
            satoshis: amount,
          }))
          .change(privateKey.toAddress())
          .setInputScript(0, (tx, output) => {
            const preimage = getPreimage(
              tx,
              output.script,
              output.satoshis,
              0,
              sighashType
            );

            const sigB = signTx(unlockingTx, privateKeyB, escrow.lockingScript, amount);
            const sigE = signTx(unlockingTx, privateKeyE, escrow.lockingScript, amount);

            return escrow.unlock(
              new SigHashPreimage(toHex(preimage)),
              new PubKey(toHex(publicKeyB)),
              new Sig(toHex(sigB)),
              new PubKey(toHex(publicKeyE)),
              new Sig(toHex(sigE)),
              new Bytes(toHex(secretBuf2)),
              new Ripemd160(toHex(publicKeyHash)),
              tx.getChangeAmount()
            )
              .toScript();
          })
          .sign(privateKey)
          .seal()
          
        break;
    }

    const unlockingTxid = await sendTx(unlockingTx);
    console.log('unlocking txid:   ', unlockingTxid);

    console.log('Succeeded on testnet');
  } catch (error) {
    console.log('Failed on testnet');
    showError(error);
  }
})();
