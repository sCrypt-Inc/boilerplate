const { expect } = require('chai');
const { buildContractClass, Bytes } = require('scryptlib');
const { compileContract } = require('../../helper');

describe('Test sCrypt contract Serializer In Javascript', () => {
  let demo, result

  before(() => {
    const Demo = buildContractClass(compileContract('serializer.scrypt'));
    demo = new Demo();
  });

  it('should return true', () => {
    const getRandomInt = digits => Math.floor(Math.random() * 2 ** digits)
    const getRandomHex = digits => [...Array(digits)].map(() => Math.floor(Math.random() * 16).toString(16)).join('');
        
    for (i = 0; i < 100; i++) {
        const digits = getRandomInt(6) + 1
        const n = getRandomInt(digits)
        // bytes must have even hex digits
        const h = getRandomHex(digits * 2)
        
        result = demo.main(n % 2 === 0, new Bytes(h), n).verify()
        expect(result.success, result.error).to.be.true
    }
  });
});
