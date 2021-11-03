/**
 * Testnet deployment for RPuzzle contract in JavaScript
 * Some code is inspired by Dean Little's library: https://github.com/deanmlittle/rpuzzle
 **/
const {
  bsv,
  buildContractClass,
  PubKey,
  Ripemd160,
  Sig,
  signTx,
  toHex,
} = require('scryptlib');

const {
  loadDesc,
  deployContract,
  createInputFromPrevTx,
  sendTx,
  showError,
  inputIndex,
} = require('../helper');

const { privateKey } = require('../privateKey');

const ECDSA = bsv.crypto.ECDSA;
const Transaction = bsv.Transaction;
const Script = bsv.Script;
const Signature = bsv.crypto.Signature;
const BN = bsv.crypto.BN;
const Point = bsv.crypto.Point;

const secret = 'This is a secret message!';
const secretHash = bsv.crypto.Hash.sha256(Buffer.from(secret));
const k = Buffer.from(secretHash);

const G = Point.getG();
const N = Point.getN();
const Q = G.mul(new BN.fromBuffer(k));
const r = Q.x.umod(N).toBuffer();
const r0 = r[0] > 127 ? Buffer.concat([Buffer.alloc(1), r]) : r;
const rhash = bsv.crypto.Hash.sha256ripemd160(r0);

// privateKey for buildPublicKeyHashOut - output of unlocking transaction
const privateKeyX = new bsv.PrivateKey.fromRandom('testnet');
console.log(`Private key generated: '${privateKeyX.toWIF()}'`);

const amount = 2000;

(async () => {
  try {
    // initialize contract
    const RPuzzle = buildContractClass(loadDesc('rpuzzle_debug_desc.json'));
    const rpuzzle = new RPuzzle(new Ripemd160(toHex(rhash)));

    // deploy contract on testnet
    const lockingTx = await deployContract(rpuzzle, amount);
    console.log('locking txid:     ', lockingTx.id)

    // call contract method on testnet

    const unlockingTx = new bsv.Transaction();
    unlockingTx.addInput(createInputFromPrevTx(lockingTx))
      .setOutput(0, (tx) => {
        const newLockingScript = bsv.Script.buildPublicKeyHashOut(
          privateKeyX.toAddress()
        );

        return new bsv.Transaction.Output({
          script: newLockingScript,
          satoshis: amount - tx.getEstimateFee()
        })
      })
      .setInputScript(0, (tx, output) => {
        const sighashType = Signature.SIGHASH_ALL | Signature.SIGHASH_FORKID;
        const flags =
          Script.Interpreter.SCRIPT_VERIFY_MINIMALDATA |
          Script.Interpreter.SCRIPT_ENABLE_SIGHASH_FORKID |
          Script.Interpreter.SCRIPT_ENABLE_MAGNETIC_OPCODES |
          Script.Interpreter.SCRIPT_ENABLE_MONOLITH_OPCODES;

        const hashbuf = Transaction.Sighash.sighash(
          tx,
          sighashType,
          inputIndex,
          rpuzzle.lockingScript,
          new BN.fromNumber(amount),
          flags
        );

        // ephemeral privateKey used for generating the r signature
        const privateKeyR = new bsv.PrivateKey.fromRandom('testnet');
        const publicKeyR = privateKeyR.publicKey;

        const ecdsa = new ECDSA({
          hashbuf: hashbuf,
          privkey: privateKeyR,
          endian: 'little',
          k: BN.fromBuffer(k),
        });

        sigr = ecdsa
          .sign()
          .sig.set({
            nhashtype: sighashType,
          })
          .toTxFormat();

        // build a second signature to prevent Signature Forgeability
        // https://wiki.bitcoinsv.io/index.php/R-Puzzles
        const sig = signTx(
          tx,
          privateKeyR,
          rpuzzle.lockingScript,
          output.satoshis
        );

        return rpuzzle
          .unlock(
            new Sig(toHex(sig)),
            new PubKey(toHex(publicKeyR)),
            new Sig(toHex(sigr))
          )
          .toScript();
      })
      .seal()


    const unlockingTxid = await sendTx(unlockingTx);
    console.log('unlocking txid:   ', unlockingTxid);

    console.log('Succeeded on testnet');
  } catch (error) {
    console.log('Failed on testnet');
    showError(error);
  }
})();
