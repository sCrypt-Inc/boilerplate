import { expect } from 'chai';
import { buildContractClass, VerifyResult } from "scryptlib";
import { compileContract } from "../../helper";

describe('Test sCrypt contract Demo In Typescript', () => {
  let demo: any
  let result: VerifyResult

  before(() => {
    const Demo = buildContractClass(compileContract('demo.scrypt'))
    demo = new Demo(7n, 4n)
  });

  it('should return true', () => {
    result = demo.add(7n + 4n).verify()
    expect(result.success, result.error).to.be.true
    result = demo.sub(7n - 4n).verify()
    expect(result.success, result.error).to.be.true
  });

  it('should throw error', () => {
    result = demo.add(0n).verify()
    expect(result.success, result.error).to.be.false
    result = demo.sub(1n).verify()
    expect(result.success, result.error).to.be.false
  });
});
