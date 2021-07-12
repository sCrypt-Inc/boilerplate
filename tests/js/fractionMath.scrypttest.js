const {
  expect
} = require('chai');
const {
  buildContractClass,
  buildTypeClasses
} = require('scryptlib');
const {
  compileContract
} = require('../../helper');

let contract = compileContract('fractionMath.scrypt');
const FRM = buildContractClass(contract);
let {
  Fraction
} = buildTypeClasses(contract);
const nan = new Fraction({
  n: 0,
  d: 0
}); // not a number

describe('Test FRMath Library In Javascript', () => {
  let frm, result

  before(() => {
    frm = new FRM();
  });

  it('should return true', () => {
    result = frm.unlock0(new Fraction({
      n: 21,
      d: 20
    }), 1).verify()
    expect(result.success, result.error).to.be.true

    result = frm.unlock1(
      new Fraction({
        n: 1,
        d: 1
      }),
      new Fraction({
        n: 2,
        d: 1
      }),
      new Fraction({
        n: 20,
        d: 990
      }), // scaled-up
      false
    ).verify()
    expect(result.success, result.error).to.be.true

    for (let i = 0; i < 100; i++) {
      let n = Math.floor(Math.random(100)),
        d = Math.floor(Math.random(100)) + 1;
      result = frm.unlock1(
        new Fraction({
          n: 2 * n,
          d
        }),
        new Fraction({
          n,
          d
        }),
        new Fraction({
          n: 2 * n * n,
          d: n * d + 100 * d * d
        }),
        false
      ).verify()
      expect(result.success, result.error).to.be.true
    }

  });

  it('should return true if using non-strict methods', () => {
    result = frm.unlock1(
      new Fraction({
        n: 0,
        d: 1
      }),
      new Fraction({
        n: 100,
        d: 1
      }),
      nan,
      false  // use non-strict methods
    ).verify()
    expect(result.success, result.error).to.be.true
  });

  it('should return false if using strict methods', () => {
    result = frm.unlock1(
      new Fraction({
        n: 0,
        d: 1
      }),
      new Fraction({
        n: 100,
        d: 1
      }),
      nan,
      true  // use strict methods
    ).verify()
    expect(result.success, result.error).to.be.false
  });

});