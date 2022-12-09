const { expect } = require('chai');
const { buildContractClass } = require('scryptlib');
const { compileContract } = require('../../helper');
const bigintRnd = require('bigint-rnd');
const rangLimit = 10n ** 100n;

describe('Test sCrypt contract BitwiseTest In Javascript', () => {
  let bitwise, result

  before(() => {
    const BitwiseTest = buildContractClass(compileContract('bitwiseTest.scrypt'));
    bitwise = new BitwiseTest();
  });

  function expectBitwiseSuccess(x, y) {
    result = bitwise.bitwise(x, y, x & y, x | y, x ^ y, ~x).verify()
    expect(result.success, result.error).to.be.true
  }

  it('bitwise should return true', () => {

    expectBitwiseSuccess(0n, 0n)
    expectBitwiseSuccess(1n, 1n)
    expectBitwiseSuccess(-1n, -1n)
    expectBitwiseSuccess(0n, 1n)
    expectBitwiseSuccess(1n, 0n)
    expectBitwiseSuccess(-1n, 0n)
    expectBitwiseSuccess(0n, -1n)
    expectBitwiseSuccess(1n, -1n)
    expectBitwiseSuccess(-1n, 1n)

    for (let i = 0; i < 10; i++) {
      let x = bigintRnd(rangLimit);
      let y = bigintRnd(rangLimit);
      expectBitwiseSuccess(x, y)
      expectBitwiseSuccess(x, y*-1n)
      expectBitwiseSuccess(x*-1n, y)
      expectBitwiseSuccess(x*-1n, y*-1n)
    }

  });

  it('Heavy: bitwise should return true', () => {

    for (let i = 0; i < 1000; i++) {
      let x = bigintRnd(rangLimit);
      let y = bigintRnd(rangLimit);
      expectBitwiseSuccess(x, y)
      expectBitwiseSuccess(x, y*-1n)
      expectBitwiseSuccess(x*-1n, y)
      expectBitwiseSuccess(x*-1n, y*-1n)
    }
  });


});
