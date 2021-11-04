const { expect } = require('chai');
const { buildContractClass, bsv, PubKey, Bytes, toHex, signTx, getPreimage, Int } = require('scryptlib');
const { compileContract, newTx, inputSatoshis, inputIndex } = require('../../helper');
const Point = bsv.crypto.Point;


const Signature = bsv.crypto.Signature

const sighashType = Signature.SIGHASH_ALL | Signature.SIGHASH_FORKID

const EC = require('elliptic').ec;
const ec = new EC('secp256k1');

const p = ec.curve.p;


function modular_divide(bn_a, bn_b, bn_m) {
  a = bn_a.mod(bn_m)
  inv = bn_b.invm(bn_m)
  return inv.mul(a).mod(bn_m)
}

function get_lambda(P1, P2) {
  // lambda - gradient of the line between P1 and P2
  // if P1 != P2:
  //    lambda = ((P2y - P1y) / (P2x - P1x)) % p
  // else:
  //    lambda = ((3 * (P1x**2) + a) / (2 * P1y)) % p
  if (P1.getX().eq(P2.getX()) && P1.getY().eq(P2.getY())) {
    let lambda_numerator = P1.getX().sqr().muln(3)
    let lambda_denominator = P1.getY().muln(2)
    return modular_divide(lambda_numerator, lambda_denominator, p)
  } else {
    let lambda_numerator = P2.getY().sub(P1.getY())
    let lambda_denominator = P2.getX().sub(P1.getX())
    return modular_divide(lambda_numerator, lambda_denominator, p)
  }
}



describe('Test sCrypt contract Oracle In Javascript', () => {


  const privateKey = new bsv.PrivateKey.fromRandom('testnet')
  const publicKey = new bsv.PublicKey(Object.assign(
    privateKey.publicKey.toJSON(),
    {
      compressed: false,
      network: 'testnet'
    }
  ))

  const dataBuffer = Buffer.from("abc");
  const data = dataBuffer
  const sha256Data = bsv.crypto.Hash.sha256(dataBuffer);

  //because bitcoin use little-end, we should reverse sha256Data as the private key.
  const privateKeyX = new bsv.PrivateKey.fromBuffer(sha256Data.reverse(), 'testnet')
  const publicKeyX = privateKeyX.publicKey

  const n = Point.getN()
  const bn = privateKey.toBigNumber().add(bsv.crypto.BN.fromBuffer(sha256Data)).umod(n);
  const derivedOraclePrivateKey = new bsv.PrivateKey(bn, 'testnet')

  const derivedOraclePubKey = new bsv.PublicKey(Object.assign(
    derivedOraclePrivateKey.publicKey.toJSON(),
    {
      compressed: false,
      network: 'testnet'
    }
  ))


  let PointX, PointP;

  PointX = publicKeyX.point;
  PointP = publicKey.point;

  let lambda = get_lambda(PointP, PointX)


  let oracle, result;
  let tx = newTx();
  tx.addOutput(new bsv.Transaction.Output({
    script: bsv.Script.buildPublicKeyHashOut(privateKey.toAddress()),
    satoshis: inputSatoshis,
  }))

  before(() => {
    const OracleTest = buildContractClass(compileContract('oracleTest.scrypt'));
    oracle = new OracleTest(new PubKey(toHex(publicKey)));

  });

  it('should return true', () => {


    oracle.txContext = {
      tx,
      inputIndex,
      inputSatoshis
    }

    const sig = signTx(tx, derivedOraclePrivateKey, oracle.lockingScript, inputSatoshis, 0, sighashType)
    const preimage = getPreimage(tx, oracle.lockingScript, inputSatoshis, 0, sighashType)
    result = oracle.unlock(new Bytes(toHex(data)), sig, new PubKey(toHex(derivedOraclePubKey)),
      new PubKey(toHex(publicKeyX)),
      new Int(lambda.toString(10)),
      preimage
    ).verify()

    expect(result.success, result.error).to.be.true
  });

  it('should fail with invalid derivedOraclePrivateKey', () => {


    oracle.txContext = {
      tx,
      inputIndex,
      inputSatoshis
    }
    const wrongDerivedOraclePrivateKey = new bsv.PrivateKey.fromRandom('testnet')

    const sig = signTx(tx, wrongDerivedOraclePrivateKey, oracle.lockingScript, inputSatoshis, 0, sighashType)
    const preimage = getPreimage(tx, oracle.lockingScript, inputSatoshis, 0, sighashType)
    result = oracle.unlock(new Bytes(toHex(data)), sig, new PubKey(toHex(derivedOraclePubKey)),
      new PubKey(toHex(publicKeyX)),
      new Int(lambda.toString(10)),
      preimage
    ).verify()

    expect(result.success, result.error).to.be.false

  });


  it('should fail with invalid derivedOraclePubKey', () => {


    oracle.txContext = {
      tx,
      inputIndex,
      inputSatoshis
    }

    const wrongDerivedOraclePubKey = bsv.PrivateKey.fromRandom('testnet').publicKey

    const sig = signTx(tx, derivedOraclePrivateKey, oracle.lockingScript, inputSatoshis, 0, sighashType)
    const preimage = getPreimage(tx, oracle.lockingScript, inputSatoshis, 0, sighashType)
    result = oracle.unlock(new Bytes(toHex(data)), sig, new PubKey(toHex(wrongDerivedOraclePubKey)),
      new PubKey(toHex(publicKeyX)),
      new Int(lambda.toString(10)),
      preimage
    ).verify()

    expect(result.success, result.error).to.be.false

  });


  it('should fail with invalid publicKeyX', () => {


    oracle.txContext = {
      tx,
      inputIndex,
      inputSatoshis
    }
    const wrongPublicKeyX = toHex(new bsv.PrivateKey.fromRandom('testnet').publicKey)
    const sig = signTx(tx, derivedOraclePrivateKey, oracle.lockingScript, inputSatoshis, 0, sighashType)
    const preimage = getPreimage(tx, oracle.lockingScript, inputSatoshis, 0, sighashType)
    result = oracle.unlock(new Bytes(toHex(data)), sig, new PubKey(toHex(derivedOraclePubKey)),
      new PubKey(toHex(wrongPublicKeyX)),
      new Int(lambda.toString(10)),
      preimage
    ).verify()

    expect(result.success, result.error).to.be.false

  });


  it('should fail with different data', () => {

    oracle.txContext = {
      tx,
      inputIndex,
      inputSatoshis
    }

    const fakeData = Buffer.from("fakeData");

    const sig = signTx(tx, derivedOraclePrivateKey, oracle.lockingScript, inputSatoshis, 0, sighashType)
    const preimage = getPreimage(tx, oracle.lockingScript, inputSatoshis, 0, sighashType)
    result = oracle.unlock(new Bytes(toHex(fakeData)), sig, new PubKey(toHex(derivedOraclePubKey)),
      new PubKey(toHex(publicKeyX)),
      new Int(lambda.toString(10)),
      preimage
    ).verify()

    expect(result.success, result.error).to.be.false

  });


});
