import { expect } from 'chai';
import { buildContractClass } from "scryptlib";
import { loadDesc } from "../../helper";

describe('Test sCrypt contract Demo In Typescript', () => {
  let demo: any;

  before(() => {
    const Demo = buildContractClass(loadDesc('demo_desc.json'));
    demo = new Demo(7, 4);
  });

  it('should return true', () => {
    expect(demo.add(7 + 4).verify()).to.equal(true);
    expect(demo.sub(7 - 4).verify()).to.equal(true);
  });

  it('should throw error', () => {
    expect(() => { demo.add(0).verify() }).to.throws(/failed to verify/);
    expect(() => { demo.sub(1).verify() }).to.throws(/failed to verify/);
  });
});
