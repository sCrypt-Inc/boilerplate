const { expect } = require('chai');
const { buildContractClass, Bytes } = require('scryptlib');
const { compileContract } = require('../../helper');

describe('Test sCrypt contract RabinSignature In Javascript', () => {
  let rabin, result

  before(() => {
    const RabinSignature = buildContractClass(compileContract('rabin.scrypt'));
    rabin = new RabinSignature();
  });

  it('should return true', () => {
    // append "n" for big int
    result = rabin.verifySig(
        0x12f1dd2e0965dc433b0d32b86333b0fb432df592f6108803d7afe51a14a0e867045fe22af85862b8e744700920e0b7e430a192440a714277efb895b51120e4ccn, 
        new Bytes('00112233445566778899aabbccddeeff'),
        new Bytes('00000000'),
        0x15525796ddab817a3c54c4bea4ef564f090c5909b36818c1c13b9e674cf524aa3387a408f9b63c0d88d11a76471f9f2c3f29c47a637aa60bf5e120d1f5a65221n
      ).verify()
    expect(result.success, result.error).to.be.true
  });

  it('should throw error with wrong padding', () => {
    result = rabin.verifySig(
        0x12f1dd2e0965dc433b0d32b86333b0fb432df592f6108803d7afe51a14a0e867045fe22af85862b8e744700920e0b7e430a192440a714277efb895b51120e4ccn, 
        new Bytes('00112233445566778899aabbccddeeff'),
        new Bytes('00'),
        0x15525796ddab817a3c54c4bea4ef564f090c5909b36818c1c13b9e674cf524aa3387a408f9b63c0d88d11a76471f9f2c3f29c47a637aa60bf5e120d1f5a65221n
      ).verify()
    expect(result.success, result.error).to.be.false
  });

  it('should throw error with wrong signature', () => {
    result = rabin.verifySig(
        0xff12f1dd2e0965dc433b0d32b86333b0fb432df592f6108803d7afe51a14a0e867045fe22af85862b8e744700920e0b7e430a192440a714277efb895b51120e4ccn, 
        new Bytes('00112233445566778899aabbccddeeff'),
        new Bytes('00000000'),
        0x15525796ddab817a3c54c4bea4ef564f090c5909b36818c1c13b9e674cf524aa3387a408f9b63c0d88d11a76471f9f2c3f29c47a637aa60bf5e120d1f5a65221n
      ).verify()
    expect(result.success, result.error).to.be.false
  });
});