const { expect } = require('chai');
const { interfaces } = require('mocha');
const { buildContractClass, Struct, Bytes, Int } = require('scryptlib');
const { compileContract } = require('../../helper');



describe('Test sCrypt contract Demo In Javascript', () => {
  let StructDemo, person, result

  before(() => {
    StructDemo = buildContractClass(compileContract('structdemo.scrypt'));
    person = new StructDemo(new Struct({
      name: new Bytes("7361746f736869206e616b616d6f746f"),
      leftHanded: false,
      age: 33,
      addr: new Bytes("68656c6c6f20776f726c6421")
    }));
  });



  it('should success', () => {
    result = person.main(new Struct({
      name: new Bytes("7361746f736869206e616b616d6f746f"),
      leftHanded: false,
      age: 33,
      addr: new Bytes("68656c6c6f20776f726c6421")
    })).verify()
    expect(result.success, result.error).to.be.true
  });


  it('should throw', () => {

    expect(() => {
      person = new StructDemo(new Struct({
        name:  1,
        isMale: false,
        age: 33,
        addr: new Bytes("68656c6c6f20776f726c6421")
      }));
    }).to.throws(/wrong argument type, expected bytes but got int/);


    expect(() => {
      person.main(new Struct({
        leftHanded: false,
        age: 33,
        addr: new Bytes("68656c6c6f20776f726c6421")
      })).verify()
    }).to.throws(/argument of type struct Person missing member name/);

    expect(() => {
      person.main(new Struct({
        id: 01,
        name: new Bytes("7361746f736869206e616b616d6f746f"),
        leftHanded: false,
        age: 33,
        addr: new Bytes("68656c6c6f20776f726c6421")
      })).verify()
    }).to.throws(/id is not a member of struct Person/);


    it('should verify failed', () => {

      result = person.main(new Struct({
        name: new Bytes("7361746f736869206e616b616d6f746f"),
        leftHanded: false,
        age: 32,
        addr: new Bytes("68656c6c6f20776f726c6421")
      })).verify()
      expect(result.success, result.error).to.be.false

    });

    it('should verify failed', () => {

      result = person.main(new Struct({
        name: new Bytes("7361746f736869206e616b616d6f746e"),
        leftHanded: false,
        age: 33,
        addr: new Bytes("68656c6c6f20776f726c6421")
      })).verify()
      expect(result.success, result.error).to.be.false

    });

    it('should verify failed', () => {

      result = person.main(new Struct({
        name: new Bytes("7361746f736869206e616b616d6f746f"),
        leftHande1d: false,
        age: 33,
        addr: new Bytes("68656c6c6f20776f726c6420")
      })).verify()
      expect(result.success, result.error).to.be.false
    });

  });
});
