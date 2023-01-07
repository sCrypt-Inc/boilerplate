const { expect } = require('chai');
const { buildContractClass, Bytes } = require('scryptlib');
const { compileContract } = require('../../helper');


describe('Test sCrypt contract StructDemo In Javascript', () => {
  let structDemo, result, Person

  before(() => {

    const StructDemo = buildContractClass(compileContract('structdemo.scrypt'));

    structDemo = new StructDemo({
      name: Bytes("7361746f736869206e616b616d6f746f"),
      leftHanded: false,
      age: 33,
      addr: Bytes("68656c6c6f20776f726c6421")
    });
  });



  it('should success', () => {
    result = structDemo.main({
      name: Bytes("7361746f736869206e616b616d6f746f"),
      leftHanded: false,
      age: 33,
      addr: Bytes("68656c6c6f20776f726c6421")
    }).verify()
    expect(result.success, result.error).to.be.true
  });


  it('should verify failed', () => {

    result = structDemo.main({
      name: Bytes("7361746f736869206e616b616d6f746f"),
      leftHanded: false,
      age: 32,
      addr: Bytes("68656c6c6f20776f726c6421")
    }).verify()
    expect(result.success, result.error).to.be.false

  });

  it('should verify failed', () => {

    result = structDemo.main({
      name: Bytes("7361746f736869206e616b616d6f746e"),
      leftHanded: false,
      age: 33,
      addr: Bytes("68656c6c6f20776f726c6421")
    }).verify()
    expect(result.success, result.error).to.be.false

  });

  it('should verify failed', () => {

    result = structDemo.main({
      name: Bytes("7361746f736869206e616b616d6f746f"),
      leftHanded: false,
      age: 33,
      addr: Bytes("68656c6c6f20776f726c6420")
    }).verify()
    expect(result.success, result.error).to.be.false
  });


});
