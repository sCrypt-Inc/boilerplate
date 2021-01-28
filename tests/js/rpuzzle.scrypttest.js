/**
 * An example test for RPuzzle contract in JavaScript
 * Some code is inspired by Dean Little's library: https://github.com/deanmlittle/rpuzzle
 **/

const { expect } = require('chai');

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
  compileContract,
  inputIndex,
  inputSatoshis,
  newTx,
} = require('../../helper');

const ECDSA = bsv.crypto.ECDSA;
const Transaction = bsv.Transaction;
const Script = bsv.Script;
const Signature = bsv.crypto.Signature;
const BN = bsv.crypto.BN;
const Point = bsv.crypto.Point;

const secret = 'This is a secret message!';
const secretHash = bsv.crypto.Hash.sha256(Buffer.from(secret));
const k = Buffer.from(secretHash);

const secret_false = 'This is the wrong secret message!';
const secretHash_false = bsv.crypto.Hash.sha256(Buffer.from(secret_false));
const k_false = Buffer.from(secretHash_false);

const G = Point.getG();
const N = Point.getN();
const Q = G.mul(new BN.fromBuffer(k));
const r = Q.x.umod(N).toBuffer();
const r0 = r[0] > 127 ? Buffer.concat([Buffer.alloc(1), r]) : r;
const rhash = bsv.crypto.Hash.sha256ripemd160(r0);

// ephemeral privateKey used for generating the r signature
const privateKeyR = new bsv.PrivateKey.fromRandom('testnet');
const publicKeyR = privateKeyR.publicKey;

describe('Test sCrypt contract RPuzzle in Javascript', () => {
  let rpuzzle, sigr, sigr_false, sig, result;

  before(() => {
    const RPuzzle = buildContractClass(compileContract('rpuzzle.scrypt'));
    rpuzzle = new RPuzzle(new Ripemd160(toHex(rhash)));

    const tx = newTx();
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
      new BN.fromNumber(inputSatoshis),
      flags
    );

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
    sig = signTx(tx, privateKeyR, rpuzzle.lockingScript.toASM(), inputSatoshis);

    const ecdsa_false = new ECDSA({
      hashbuf: hashbuf,
      privkey: privateKeyR,
      endian: 'little',
      k: BN.fromBuffer(k_false),
    });

    sigr_false = ecdsa_false.sign().sig;

    // set txContext for verification
    rpuzzle.txContext = {
      tx,
      inputIndex,
      inputSatoshis,
    };
  });

  it('should succeed when pushing right signature with right secret', () => {
    result = rpuzzle
      .unlock(
        new Sig(toHex(sig)),
        new PubKey(toHex(publicKeyR)),
        new Sig(toHex(sigr))
      )
      .verify();
    expect(result.success, result.error).to.be.true;
  });
  
  it('should fail when pushing wrong signature with wrong secret', () => {
    result = rpuzzle
    .unlock(
      new Sig(toHex(sig)),
      new PubKey(toHex(publicKeyR)),
      new Sig(toHex(sigr_false))
    )
    .verify();
    expect(result.success, result.error).to.be.false;
  });
});