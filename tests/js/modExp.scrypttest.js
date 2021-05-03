const { expect } = require('chai');
const { buildContractClass } = require('scryptlib');
const { compileContract } = require('../../helper');

describe('Test sCrypt contract ModExpr In Javascript', () => {
  let Demo, result

  before(() => {
    Demo = buildContractClass(compileContract('modExp.scrypt'));
  });

  it('should return true', () => {
    // 445 = 4^13%497
    const demo = new Demo(497);
    result = demo.main(4, 13, 445).verify()
    expect(result.success, result.error).to.be.true
  });

  it('should return true', () => {
    // https://rosettacode.org/wiki/Modular_exponentiation
    const demo = new Demo(10000000000000000000000000000000000000000n);
    result = demo.main(2988348162058574136915891421498819466320163312926952423791023078876139n,
                       2351399303373464486466122544523690094744975233415544072992656881240319n,
                       1527229998585248450016808958343740453059n).verify()
    expect(result.success, result.error).to.be.true
  });
});
