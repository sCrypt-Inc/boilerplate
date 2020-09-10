const { expect } = require('chai');
const { buildContractClass, Bytes } = require('scryptlib');
const { compileContract } = require('../../helper');

// (min, max]
const getRandomInt = (min, max) => Math.floor(Math.random() * (max - min) + min + 1)
// 1 byte is 2 hex char
const getRandomBytesHex = bytes => [...Array(bytes * 2)].map(() => Math.floor(Math.random() * 16).toString(16)).join('')

describe('Test sCrypt contract Serializer In Javascript', () => {
  let demo, result

  before(() => {
    const Demo = buildContractClass(compileContract('serializer.scrypt'));
    demo = new Demo();
  });

  it('should return true', () => {
    // skip largest two bounds since they cause out of memory error
    const varIntBounds = [0x0, 0xFC, 0xFFFF] // , 0xFFFFFFFF, 0xFFFFFFFFFFFFFFFF
    for (let i = 0; i < varIntBounds.length - 1; i++) {
      for (let j = 0; j < 10; j++) {
        const n = getRandomInt(0, 2 ** 32)
        
        const m = getRandomInt(varIntBounds[i], varIntBounds[i + 1])
        const h = getRandomBytesHex(m)
        
        result = demo.main(n % 2 === 0, new Bytes(h), n).verify()
        expect(result.success, result.error).to.be.true
      }
    }
  });
});
