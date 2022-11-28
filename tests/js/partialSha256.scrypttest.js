const { expect } = require('chai');
const crypto = require('crypto');
const { buildContractClass, Bytes, String, partialSha256 } = require('scryptlib');
const { compileContract, getRandomInt } = require('../../helper');


describe('Heavy: Test sCrypt contract PartialSha256 In Javascript', () => {
  let instance, result, PartialSha256Test;

  before(() => {
    PartialSha256Test = buildContractClass(compileContract('partialSha256Test.scrypt'));
  })


  it('test string: 2 chuck', () => {
    instance = new PartialSha256Test(new String("hIFsBdVHgTZrrtNNj8JcmafZmle2r55igJSCl8fZ4PxDzJOVF4y4e6vFtSG2J46wAkZAHgsdQKMbqlng"));
    result = instance.unlock(new Bytes("0c07caef6798aa7f902084465d6ed33a17b52a3a862a1397e92189996e6a659f"),
      new Bytes("416b5a4148677364514b4d62716c6e67"), new Bytes("800000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000280")).verify()
    expect(result.success, result.error).to.be.true
  });


  it('test string: 4 chuck', () => {
    instance = new PartialSha256Test(new String("hIFsBdVHgTZrrtNNj8JcmafZmle2r55igJSCl8fZ4PxDzJOVF4y4e6vFtSG2J46wAkZAHgsdQKMbqlnghIFsBdVHgTZrrtNNj8JcmafZmle2r55igJSCl8fZ4PxDzJOVF4y4e6vFtSG2J46wAkZAHgsdQKMbqlnghIFsBdVHgTZrrtNNj8JcmafZmle2r55igJSCl8fZ4PxDzJOVF4y4e6vFtSG2J46wAkZAHgsdQKMbqlnghIFsBdVHgTZrrtNNj8JcmafZmle2r55igJSCl8fZ4PxDzJOVF4y4e6vFtSG2J46wAkZAHgsdQKMbqlng1"));
    result = instance.unlock(new Bytes("74cd169a8a2d9c8a90056ee92c31a6461e52995bd673c39e14205abb5e3876ea"),
      new Bytes("31"), new Bytes("800000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a08")).verify()
    expect(result.success, result.error).to.be.true
  });



  it('test string: 4 chuck', () => {
    instance = new PartialSha256Test(new String("hIFsBdVHgTZrrtNNj8JcmafZmle2r55igJSCl8fZ4PxDzJOVF4y4e6vFtSG2J46wAkZAHgsdQKMbqlnghIFsBdVHgTZrrtNNj8JcmafZmle2r55igJSCl8fZ4PxDzJOVF4y4e6vFtSG2J46wAkZAHgsdQKMbqlnghIFsBdVHgTZrrtNNj8JcmafZmle2r55igJSCl8fZ4PxDzJOVF4y4e6vFtSG2J46wAkZAHgsdQKMbqlnghIFsBdVHgTZrrtNNj8JcmafZmle2r55igJSCl8fZ4PxDzJOVF4y4e6vFtSG2J46wAkZAHgsdQKMbqlng1"));
    result = instance.unlock(new Bytes("1f0683f5d28ff29bdc3c31fcc514663ec40aedec4a4741e0ad9522981fcb7597"),
      new Bytes("6a384a636d61665a6d6c653272353569674a53436c38665a345078447a4a4f564634793465367646745347324a343677416b5a4148677364514b4d62716c6e6731"),
      new Bytes("800000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a08")).verify()
    expect(result.success, result.error).to.be.true
  });


  it('test tx: 2b34fe1cbc5a0d5f69e485dab1af2ee7bbf9664c21fa2b19013c77c7db4cc35f', () => {
    instance = new PartialSha256Test(new Bytes("0100000001d5c182b1e334448e26d0823a26197ce759ce3448e46872031fafa2635e3b240f050000006a4730440220650d0b22d25dd39804ca37b1aecb4f21c324eafb8dfb7886c7a1ead94cb6012c022048cb3bb7d4d7bf17da45aa14056751f77ad93950619af3ec5fe8d765638546c94121039268c8760972df95dc43963e97ccaf9184a3e31ee0453fcd5fbc21e88f383ed9ffffffff0123020000000000001976a91404f8424c3116d1a7ba1c969cdbc1ac67be6fc96188ac00000000"));
    result = instance.unlock(new Bytes("c3283e5b77bdc8ca8823fe5cfb5eeb41e5cdec81236195edda6781aa149c7e56"),
      new Bytes("97ccaf9184a3e31ee0453fcd5fbc21e88f383ed9ffffffff0123020000000000001976a91404f8424c3116d1a7ba1c969cdbc1ac67be6fc96188ac00000000"),
      new Bytes("80000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000005f8")).verify()
    expect(result.success, result.error).to.be.true
  });




  it('test randomByte', () => {

    for (let i = 0; i < 100; i++) {
        const data = crypto.randomBytes(getRandomInt(64, 1000));
        const [hash, partialPreimage, padding] = partialSha256(data, parseInt(data.length/64) -1);
        instance = new PartialSha256Test(new Bytes(data.toString('hex')));
        result = instance.unlock(new Bytes(hash),
          new Bytes(partialPreimage),
          new Bytes(padding)).verify()
        expect(result.success, result.error).to.be.true
    }
  });

});
