const { expect } = require('chai');
const { bsv, buildContractClass, Int } = require('scryptlib');
const { compileContract, inputIndex, inputSatoshis, newTx } = require('../../helper');

const privateKey = new bsv.PrivateKey.fromRandom('testnet')
const publicKey = privateKey.publicKey
const pkh = bsv.crypto.Hash.sha256ripemd160(publicKey.toBuffer())

const tx = newTx();
describe('Test sCrypt contract Asm In Javascript', () => {
  let number, result

  before(() => {
    const Number = buildContractClass(compileContract('number.scrypt'))
    number = new Number()

  });

  it('equal 2==2', () => {
    result = number.equal(2, 2).verify()
    expect(result.success, result.error).to.be.true
  });

  it('add 1+2==3', () => {
    result = number.add(1, 2, 3).verify()
    expect(result.success, result.error).to.be.true
  });

  it('add 1+2!=4', () => {
    result = number.add(1, 2, 4).verify()
    expect(result.success, result.error).to.be.false
  });

  it('sub 3-2==1', () => {
    result = number.sub(3, 2, 1).verify()
    expect(result.success, result.error).to.be.true
  });

  it('mul 3*2==6', () => {
    result = number.mul(3, 2, 6).verify()
    expect(result.success, result.error).to.be.true
  });

  it('div 30/2==15', () => {
    result = number.div(30, 2, 15).verify()
    expect(result.success, result.error).to.be.true
  });


  it('mul 1.2*2==2.4', () => {
    const decimals = 4
    const a = Math.trunc(1.2*10**decimals)
    const b = 2
    const c = Math.trunc(2.4*10**decimals)
    console.log(a, b, c)

    result = number.mul(a, b, c).verify()
    expect(result.success, result.error).to.be.true
  });

  it('mul 100*0.25%==0.25', () => {
    const decimals = 4
    const a = 100
    const b = Math.trunc(0.25/100*10**decimals)
    const c = Math.trunc(0.25*10**decimals)
    console.log(a, b, c)

    result = number.mul(a, b, c).verify()
    expect(result.success, result.error).to.be.true
  });

  it('mul 0.2*0.3==0.06', () => {
    const decimals = 11
    const a = Math.trunc(0.2*10**decimals)
    const b = Math.trunc(0.3*10**decimals)
    const c = Math.trunc(0.06*10**(decimals+decimals))
    console.log(a, b, c)

    result = number.mul(a, b, c).verify()
    expect(result.success, result.error).to.be.true
  });

  it('mul 0.2*0.3==0.06 bigint 1', () => {
    const decimals = 18
    const a = BigInt(0.2*10**decimals)
    const b = BigInt(0.3*10**decimals)
    const c = BigInt(0.06*10**decimals)*BigInt(10)**BigInt(decimals)
    console.log(a, b, c)

    result = number.mul(a, b, c).verify()
    expect(result.success, result.error).to.be.true
  });

  it('mul 0.2*0.3==0.06 bigint 2', () => {
    const decimals = 290
    const truncDecimals = 4
    const a = BigInt(0.2*10**truncDecimals)*BigInt(10)**BigInt(decimals-truncDecimals)
    const b = BigInt(0.3*10**truncDecimals)*BigInt(10)**BigInt(decimals-truncDecimals)
    const c = BigInt(0.06*10**truncDecimals)*BigInt(10)**BigInt(decimals-truncDecimals)*BigInt(10)**BigInt(decimals)
    console.log(a, b, c)

    result = number.mul(a, b, c).verify()
    expect(result.success, result.error).to.be.true
  });

  it('div 0.6/0.3==2 bigint 1', () => {
    const decimals = 18
    const truncDecimals = 4
    const a = BigInt(0.6*10**truncDecimals)*BigInt(10)**BigInt(decimals-truncDecimals)
    const b = BigInt(0.3*10**truncDecimals)*BigInt(10)**BigInt(decimals-truncDecimals)
    const c = BigInt(2*10**(decimals-decimals))
    console.log(a, b, c)

    result = number.div(a, b, c).verify()
    expect(result.success, result.error).to.be.true
  });


  it('div 1/3==0.333333', () => {
    const decimals = 4
    const a = Math.trunc(1*10**decimals)
    const b = Math.trunc(3*10**0)
    const c = Math.trunc(1/3*10**(decimals))
    console.log(a, b, c)

    result = number.div(a, b, c).verify()
    expect(result.success, result.error).to.be.true
  });

  it('div 22/7==3.14285714', () => {
    const decimals = 5
    const a = Math.trunc(22*10**decimals)
    const b = Math.trunc(7*10**0)
    const c = Math.trunc(22/7*10**(decimals))
    console.log(a, b, c)

    result = number.div(a, b, c).verify()
    expect(result.success, result.error).to.be.true
  });

});
