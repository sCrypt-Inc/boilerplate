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


//
const s2b = str => new Bytes(toHex(Buffer.from(str)));

describe("Test Shift Library In Javascript", () => {
  let test, result;

  before(() => {
    const Test = buildContractClass(compileContract('shiftTest.scrypt'));
    test = new Test();
  });

  it('should pow2(30) correctly', () => {
    // result = test.unlock(0, 3, Number("0x32776f70"), 2**3).verify();
    result = test.unlock(0, 30, s2b("pow2"), 2**30).verify();
    expect(result.success, result.error).to.be.true;
  });

  it('should fail on negative numbers for pow2()', () => {
    result = test.unlock(0, -3, s2b("pow2"), -1).verify();
    expect(result.success, result.error).to.be.false;
  });

  it('should shift left() correctly', () => {
    result = test.unlock(0xaabbcc, 18, s2b("left"), 0xaabbcc* 2**18).verify();
    expect(result.success, result.error).to.be.true;
  });

  it('should shift right() correctly', () => {
    result = test.unlock(0xaabbcc, 18, s2b("right"), Math.floor(0xaabbcc/ 2**18)).verify();
    expect(result.success, result.error).to.be.true;
  });

})
