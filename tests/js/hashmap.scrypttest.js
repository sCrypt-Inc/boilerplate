const { expect } = require('chai');
const { buildContractClass, buildTypeClasses, Bytes, bsv, getPreimage } = require('scryptlib');
const { compileContract, newTx } = require('../../helper');

const inputIndex = 0;
const inputSatoshis = 100000;

const outputAmount = 222222

describe('Test sCrypt contract HashMap In Javascript', () => {


  describe('hashmapTest.scrypt', () => {
    let hashMapTest, result
    before(() => {
      const HashMapTest = buildContractClass(compileContract('hashmapTest.scrypt'));
      hashMapTest = new HashMapTest();
    });
  
    it('test hashMapTest', () => {
      result = hashMapTest.test(102).verify();
      expect(result.success, result.error).to.be.true
    });
  
    it('test hashMapTest testUpdate', () => {
      result = hashMapTest.testUpdate(1).verify();
      expect(result.success, result.error).to.be.true
    });
  
    it('test hashMapTest testCollision', () => {
  
      result = hashMapTest.testCollision(1).verify();
      expect(result.success, result.error).to.be.false
    });

  })
  



  // describe('hashmapTest2.scrypt', () => {
  //   let hashMapTest, result
  //   const HashMapTest2 = buildContractClass(compileContract('hashmapTest2.scrypt'));
  //   const { HashMap } = buildTypeClasses(HashMapTest2)
  //   before(() => {
  //     hashMapTest = new HashMapTest2(new HashMap(1000));
  //   });
  
  //   it('test call testPut', () => {

  //     const tx = newTx(inputSatoshis);

  //     const map = new HashMap(1000);

  //     map.dataOffsets = new Bytes('')
  //     map.data = new Bytes('')
  //     map._size = 0
  //     map._maxSize = 1000

  //     let newLockingScript = hashMapTest.getNewStateScript({
  //       map: map
  //     })

  //     tx.addOutput(new bsv.Transaction.Output({
  //         script: newLockingScript,
  //         satoshis: outputAmount
  //     }))

  //     const preimage = getPreimage(tx, hashMapTest.lockingScript, inputSatoshis)

  //     hashMapTest.txContext = {
  //         tx: tx,
  //         inputIndex,
  //         inputSatoshis
  //     }


  //     result = hashMapTest.testPut(preimage, 102, 1111).verify();
  //     expect(result.success, result.error).to.be.true
  //   });
  
  // })
  

});
