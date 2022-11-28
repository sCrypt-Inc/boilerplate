const {
  expect
} = require('chai');
const {
  toHex, Bytes,
  buildContractClass,
  buildTypeClasses
} = require('scryptlib');
const {
  compileContract
} = require('../../helper');


const s2b = str => new Bytes(toHex(Buffer.from(str)));

describe("Test Shift10 Library In Javascript", () => {
  let test, result;

  before(() => {
    const Test = buildContractClass(compileContract('shift10Test.scrypt'));
    test = new Test();
  });

  it('should pow(14) correctly', () => {
    result = test.unlock(10, 14, s2b("pow"), 10**14).verify();
    expect(result.success, result.error).to.be.true;
  });

  it('should fail on negative numbers for pow', () => {
    result = test.unlock(0, -3, s2b("pow"), -1).verify();
    expect(result.success, result.error).to.be.false;
  });

  it('should shift left() correctly', () => {
    result = test.unlock(0xaabbcc, 8, s2b("left"), 0xaabbcc* 10**8).verify();
    expect(result.success, result.error).to.be.true;
  });

  it('should shift right() correctly', () => {
    result = test.unlock(0xaabbcc, 8, s2b("right"), Math.floor(0xaabbcc/ 10**8)).verify();
    expect(result.success, result.error).to.be.true;
  });

})
