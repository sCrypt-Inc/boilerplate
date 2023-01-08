const { expect } = require('chai');

const {
  bsv,
  buildContractClass,
  Int
} = require('scryptlib');

const {
  compileContract
} = require('../../helper');

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

describe('Test EC sCrypt contract in Javascript', () => {
  let ecAddition, P1, P2;

  before(() => {
    let contract = compileContract('ecAddition.scrypt')
    ECAddition = buildContractClass(contract);

    // P1 and P2
    k1 = bsv.PrivateKey.fromRandom('testnet')
    k2 = bsv.PrivateKey.fromRandom('testnet')
    P1 = k1.publicKey.point;
    P2 = k2.publicKey.point;

    ecAddition = new ECAddition(
      {
        x: Int(P1.getX().toString(10)),
        y: Int(P1.getY().toString(10))
      },
      {
        x: Int(P2.getX().toString(10)),
        y: Int(P2.getY().toString(10))
      },
    );
  });

  it('should succeed when pushing right point addition result', () => {
    let lambda = get_lambda(P1, P2)

    // P = P1 + P2
    let Px = lambda.sqr().sub(P1.getX()).sub(P2.getX()).umod(p)
    let Py = lambda.mul(P1.getX().sub(Px)).sub(P1.getY()).umod(p)

    result = ecAddition
      .testSum(
        Int(lambda.toString(10)),
        {
          x: Int(Px.toString(10)),
          y: Int(Py.toString(10))
        },
      )
      .verify();
    expect(result.success, result.error).to.be.true;
  });

  it('should succeed when pushing right point addition result and P1 == P2', () => {
    let lambda = get_lambda(P1, P1)

    let Px = lambda.sqr().sub(P1.getX()).sub(P1.getX()).umod(p)
    let Py = lambda.mul(P1.getX().sub(Px)).sub(P1.getY()).umod(p)

    ecAdditionSamePoint = new ECAddition(
      {
        x: Int(P1.getX().toString(10)),
        y: Int(P1.getY().toString(10))
      },
      {
        x: Int(P1.getX().toString(10)),
        y: Int(P1.getY().toString(10))
      },
    );

    result = ecAdditionSamePoint
      .testSum(
        Int(lambda.toString(10)),
        {
          x: Int(Px.toString(10)),
          y: Int(Py.toString(10))
        },
      )
      .verify();
    expect(result.success, result.error).to.be.true;
  });

  it('should succeed when pushing right point addition result and P2 == ZERO', () => {
    ecAdditionSamePoint = new ECAddition(
      {
        x: Int(P1.getX().toString(10)),
        y: Int(P1.getY().toString(10))
      },
      {
        x: Int(0),
        y: Int(0)
      },
    );

    result = ecAdditionSamePoint
      .testSum(
        Int(0),  // Lamda doesn't matter here and can be whatever value
        {
          x: Int(P1.getX().toString(10)),
          y: Int(P1.getY().toString(10))
        },
      )
      .verify();
    expect(result.success, result.error).to.be.true;
  });


  it('should fail when pushing wrong point addition result', () => {
    let lambda = get_lambda(P1, P2)

    // P = P1 + P2
    let Px = lambda.sqr().sub(P1.getX()).sub(P2.getX()).addn(1).umod(p)
    let Py = lambda.mul(P1.getX().sub(Px)).sub(P1.getY()).umod(p)

    result = ecAddition
      .testSum(
        Int(lambda.toString(10)),
        {
          x: Int(Px.toString(10)),
          y: Int(Py.toString(10))
        },
      )
      .verify();
    expect(result.success, result.error).to.be.false;
  });

  it('should fail when using wrong lambda', () => {
    let lambda = get_lambda(P1, P2).addn(1)

    // P = P1 + P2
    let Px = lambda.sqr().sub(P1.getX()).sub(P2.getX()).umod(p)
    let Py = lambda.mul(P1.getX().sub(Px)).sub(P1.getY()).umod(p)

    result = ecAddition
      .testSum(
        Int(p.toString(10)),
        {
          x: Int(Px.toString(10)),
          y: Int(Py.toString(10))
        },
      )
      .verify();
    expect(result.success, result.error).to.be.false;
  });

});