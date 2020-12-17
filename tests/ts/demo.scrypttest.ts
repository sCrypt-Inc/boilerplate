import { expect } from 'chai';
import { buildContractClass, VerifyResult } from "scryptlib";
import { compileContract } from "../../helper";

describe('Test sCrypt contract Demo In Typescript', () => {
  let demo: any
  let result: VerifyResult

  before(() => {
    const Demo = buildContractClass(compileContract('demo.scrypt'))
    demo = new Demo(7, 4)
  });

  it('should return true', () => {
    result = demo.add(7 + 4).verify()
    expect(result.success, result.error).to.be.true
    result = demo.sub(7 - 4).verify()
    expect(result.success, result.error).to.be.true
  });

  it('should throw error', () => {
    result = demo.add(0).verify()
    expect(result.success, result.error).to.be.false
    result = demo.sub(1).verify()
    expect(result.success, result.error).to.be.false
  });
});
