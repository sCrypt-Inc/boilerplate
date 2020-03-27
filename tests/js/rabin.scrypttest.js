const path = require('path');
const { expect } = require('chai');
const { buildContractClass } = require('scrypttest');

describe('Test sCrypt contract RabinSignature In Javascript', () => {
    let demo;

    before(() => {
        const RabinSignature = buildContractClass(path.join(__dirname, '../../contracts/rabin.scrypt'));
        rabin = new RabinSignature();
    });

    it('should return true', () => {
        expect(rabin.verifySig('0xcce42011b595b8ef7742710a4492a130e4b7e020097044e7b86258f82ae25f0467e8a0141ae5afd7038810f692f52d43fbb03363b8320d3b43dc65092eddf112', '0x00112233445566778899aabbccddeeff', '0x00000000', '0x2152a6f5d120e1f50ba67a637ac4293f2c9f1f47761ad1880d3cb6f908a48733aa24f54c679e3bc1c11868b309590c094f56efa4bec4543c7a81abdd96575215')).to.equal(true);
    });

    it('should return false with wrong padding', () => {
        expect(rabin.verifySig('0xcce42011b595b8ef7742710a4492a130e4b7e020097044e7b86258f82ae25f0467e8a0141ae5afd7038810f692f52d43fbb03363b8320d3b43dc65092eddf112', '0x00112233445566778899aabbccddeeff', '0x00', '0x2152a6f5d120e1f50ba67a637ac4293f2c9f1f47761ad1880d3cb6f908a48733aa24f54c679e3bc1c11868b309590c094f56efa4bec4543c7a81abdd96575215')).to.equal(false);
    });

    it('should return false with wrong signature', () => {
        expect(rabin.verifySig('0xdde42011b595b8ef7742710a4492a130e4b7e020097044e7b86258f82ae25f0467e8a0141ae5afd7038810f692f52d43fbb03363b8320d3b43dc65092eddf112', '0x00112233445566778899aabbccddeeff', '0x00000000', '0x2152a6f5d120e1f50ba67a637ac4293f2c9f1f47761ad1880d3cb6f908a48733aa24f54c679e3bc1c11868b309590c094f56efa4bec4543c7a81abdd96575215')).to.equal(false);
    });
});