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

let contract = compileContract('fixedPointTest.scrypt');
const Test = buildContractClass(contract);
const [ADD, SUB, MUL, DIV, ABS] = [0, 1, 2, 3, 4]

describe("Test FixedPoint Library In Javascript", () => {
  let test, x, y, decimal, result

  before(() => {
    test = new Test();
    decimal = 4;
  });

  it('should add 1.1 with 2.2 correctly', () => {
    x = Math.trunc(1.1*10**decimal);
    y = Math.trunc(2.2*10**decimal);
    result = test.unlock(10**decimal, x, y, ADD, 33000).verify();
    expect(result.success, result.error).to.be.true
  })

  it('should sub 1.1 with 2.2 correctly', () => {
    x = Math.trunc(1.1*10**decimal);
    y = Math.trunc(2.2*10**decimal);
    result = test.unlock(10**decimal, x, y, SUB, -11000).verify();
    expect(result.success, result.error).to.be.true
  })

  it('should mul 1.234 with 2.345 correctly', () => {
    x = Math.trunc(1.234*10**decimal);
    y = Math.trunc(2.345*10**decimal);
    result = test.unlock(10**decimal, x, y, MUL, 28937).verify();
    expect(result.success, result.error).to.be.true
  })

  it('should div 1.234 with 2.345 correctly', () => {
    x = Math.trunc(1.234*10**decimal);
    y = Math.trunc(2.345*10**decimal);
    result = test.unlock(10**decimal, x, y, DIV, 5262).verify();
    expect(result.success, result.error).to.be.true
  })

  it('should abs -1.23456 correctly', () => {
    x = Math.trunc(-1.23456*10**decimal);
    result = test.unlock(10**decimal, x, y, ABS, 12345).verify();
    expect(result.success, result.error).to.be.true
  })
})