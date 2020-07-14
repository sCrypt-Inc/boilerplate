const path = require('path');
const { expect } = require('chai');

const { num2bin } = require('../testHelper');

describe('Test testHelper', () => {
  it('tests num2bin', () => {
    expect(num2bin(0, 1)).to.equal('00');
    expect(num2bin(10, 1)).to.equal('0a');
    expect(num2bin(0x123, 2)).to.equal('2301');
    expect(num2bin(0x123456789abcde, 7)).to.equal('debc9a78563412');
    expect(num2bin(-1000, 2)).to.equal('e883');

    expect(num2bin(0, 3)).to.equal('000000');

    // padded
    expect(num2bin(1, 2)).to.equal('0100');
    expect(num2bin(0x123456789abcde, 10)).to.equal('debc9a78563412000000');
    expect(num2bin(-1000, 4)).to.equal('e8030080');

    // cannot fit
    expect(() => num2bin(128, 1)).to.throw('128 cannot fit in 1 byte[s]');
    expect(() => num2bin(0xffff, 2)).to.throw('65535 cannot fit in 2 byte[s]');
  });
});
