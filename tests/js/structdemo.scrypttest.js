const { expect } = require('chai');
const { interfaces } = require('mocha');
const { buildContractClass, buildTypeClasses, Bytes } = require('scryptlib');
const { compileContract } = require('../../helper');

let contract = compileContract('structdemo.scrypt');
let StructDemo = buildContractClass(contract);
let {Person} = buildTypeClasses(contract);


describe('Test sCrypt contract StructDemo In Javascript', () => {
  let structDemo, result

  before(() => {
    structDemo = new StructDemo(new Person({
      name: new Bytes("7361746f736869206e616b616d6f746f"),
      leftHanded: false,
      age: 33,
      addr: new Bytes("68656c6c6f20776f726c6421")
    }));
  });



  it('should success', () => {
    result = structDemo.main(new Person({
      name: new Bytes("7361746f736869206e616b616d6f746f"),
      leftHanded: false,
      age: 33,
      addr: new Bytes("68656c6c6f20776f726c6421")
    })).verify()
    expect(result.success, result.error).to.be.true
  });


  it('should verify failed', () => {

    result = structDemo.main(new Person({
      name: new Bytes("7361746f736869206e616b616d6f746f"),
      leftHanded: false,
      age: 32,
      addr: new Bytes("68656c6c6f20776f726c6421")
    })).verify()
    expect(result.success, result.error).to.be.false

  });

  it('should verify failed', () => {

    result = structDemo.main(new Person({
      name: new Bytes("7361746f736869206e616b616d6f746e"),
      leftHanded: false,
      age: 33,
      addr: new Bytes("68656c6c6f20776f726c6421")
    })).verify()
    expect(result.success, result.error).to.be.false

  });

  it('should verify failed', () => {

    result = structDemo.main(new Person({
      name: new Bytes("7361746f736869206e616b616d6f746f"),
      leftHanded: false,
      age: 33,
      addr: new Bytes("68656c6c6f20776f726c6420")
    })).verify()
    expect(result.success, result.error).to.be.false
  });


});
