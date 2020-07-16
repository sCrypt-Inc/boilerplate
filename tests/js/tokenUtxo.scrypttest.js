const path = require('path');
const { expect } = require('chai');
const { buildContractClass, bsv } = require('scrypttest');

const { inputIndex, inputSatoshis, tx, signTx, getPreimage, toHex, num2bin, DataLen, dummyTxId } = require('../testHelper');

// make a copy since it will be mutated
let tx_ = bsv.Transaction.shallowCopy(tx)
const outputAmount = 22222
    
describe('Test sCrypt contract UTXO Token In Javascript', () => {
  let token, lockingScriptCodePart

  const privateKey1 = new bsv.PrivateKey.fromRandom('testnet')
  const publicKey1 = bsv.PublicKey.fromPrivateKey(privateKey1)
  const privateKey2 = new bsv.PrivateKey.fromRandom('testnet')
  const publicKey2 = bsv.PublicKey.fromPrivateKey(privateKey2)
  const privateKey3 = new bsv.PrivateKey.fromRandom('testnet')
  const publicKey3 = bsv.PublicKey.fromPrivateKey(privateKey3)
  
  before(() => {
    const Token = buildContractClass(path.join(__dirname, '../../contracts/tokenUtxo.scrypt'), tx_, inputIndex, inputSatoshis)
    token = new Token()

    // code part
    lockingScriptCodePart = token.getLockingScript()
  });

  it('should succeed when one token is split into two', () => {
    // split 100 tokens
    const lockingScript = lockingScriptCodePart + ' OP_RETURN ' + toHex(publicKey1) + num2bin(10, DataLen) + num2bin(90, DataLen)
    
    const testSplit = (privKey, balance0, balance1, balanceInput0 = balance0, balanceInput1 = balance1) => {
      tx_ = new bsv.Transaction()

      tx_.addInput(new bsv.Transaction.Input({
        prevTxId: dummyTxId,
        outputIndex: 0,
        script: ''
      }), bsv.Script.fromASM(lockingScript), inputSatoshis)

      const newLockingScript0 = lockingScriptCodePart + ' OP_RETURN ' + toHex(publicKey2) + num2bin(0, DataLen) + num2bin(balance0, DataLen)
      tx_.addOutput(new bsv.Transaction.Output({
        script: bsv.Script.fromASM(newLockingScript0),
        satoshis: outputAmount
      }))

      if (balance1 > 0) {
        const newLockingScript1 = lockingScriptCodePart + ' OP_RETURN ' + toHex(publicKey3) + num2bin(0, DataLen) + num2bin(balance1, DataLen)
        tx_.addOutput(new bsv.Transaction.Output({
          script: bsv.Script.fromASM(newLockingScript1),
          satoshis: outputAmount
        }))
      }

      const Token = buildContractClass(path.join(__dirname, '../../contracts/tokenUtxo.scrypt'), tx_, inputIndex, inputSatoshis)
      token = new Token()
      
      token.setLockingScript(lockingScript)
      
      const preimage = getPreimage(tx_, lockingScript, inputIndex)
      const sig = signTx(tx_, privKey, token.getLockingScript())
      return token.split(toHex(sig), toHex(publicKey2), balanceInput0, outputAmount, toHex(publicKey3), balanceInput1, outputAmount, toHex(preimage))
    }

    expect(testSplit(privateKey1, 60, 40)).to.equal(true);

    // 1 to 1 transfer
    expect(testSplit(privateKey1, 100, 0)).to.equal(true);

    // balance0 cannot be 0
    expect(testSplit(privateKey1, 0, 100)).to.equal(false);
    
    // unauthorized key
    expect(testSplit(privateKey2, 60, 40)).to.equal(false);
    
    // mismatch with preimage
    expect(testSplit(privateKey1, 60, 40, 60 - 1, 40)).to.equal(false);
    expect(testSplit(privateKey1, 60, 40, 60, 40 + 1)).to.equal(false);
    
    // token imbalance after splitting
    expect(testSplit(privateKey1, 60 + 1, 40)).to.equal(false);
    expect(testSplit(privateKey1, 60, 40 - 1)).to.equal(false);
  });

  it('should succeed when two tokens are merged', () => {
    const x0 = 10
    const x1 = 50
    const expectedBalance0 = x0 + x1
    const lockingScript0 = lockingScriptCodePart + ' OP_RETURN ' + toHex(publicKey1) + num2bin(x0, DataLen) + num2bin(x1, DataLen)
    
    const y0 = 13
    const y1 = 27
    const expectedBalance1 = y0 + y1
    const lockingScript1 = lockingScriptCodePart + ' OP_RETURN ' + toHex(publicKey2) + num2bin(y0, DataLen) + num2bin(y1, DataLen)
    
    const testMerge = (inputIndex, balance0, balance1) => {
      tx_ = new bsv.Transaction()

      tx_.addInput(new bsv.Transaction.Input({
        prevTxId: dummyTxId,
        outputIndex: 0,
        script: ''
      }), bsv.Script.fromASM(lockingScript0), inputSatoshis)
      
      tx_.addInput(new bsv.Transaction.Input({
        prevTxId: dummyTxId,
        outputIndex: 1,
        script: ''
      }), bsv.Script.fromASM(lockingScript1), inputSatoshis)

      const newLockingScript0 = lockingScriptCodePart + ' OP_RETURN ' + toHex(publicKey3) + num2bin(balance0, DataLen) + num2bin(balance1, DataLen)
      tx_.addOutput(new bsv.Transaction.Output({
        script: bsv.Script.fromASM(newLockingScript0),
        satoshis: outputAmount
      }))

      const Token = buildContractClass(path.join(__dirname, '../../contracts/tokenUtxo.scrypt'), tx_, inputIndex, inputSatoshis)
      token = new Token()
      
      token.setLockingScript(inputIndex == 0 ? lockingScript0 : lockingScript1)
      
      const preimage = getPreimage(tx_, inputIndex == 0 ? lockingScript0 : lockingScript1, inputIndex)
      const sig = signTx(tx_, inputIndex == 0 ? privateKey1 : privateKey2, inputIndex == 0 ? lockingScript0 : lockingScript1, inputIndex)
      return token.merge(toHex(sig), toHex(publicKey3), inputIndex == 0, inputIndex == 0 ? balance1 : balance0, outputAmount, toHex(preimage))
    }

    // input0 only checks balance0
    expect(testMerge(0, expectedBalance0, expectedBalance1 + 1)).to.equal(true);
    expect(testMerge(0, expectedBalance0 - 1, expectedBalance1)).to.equal(false);
    
    // input1 only checks balance1
    expect(testMerge(1, expectedBalance0 - 1, expectedBalance1)).to.equal(true);
    expect(testMerge(1, expectedBalance0, expectedBalance1 + 1)).to.equal(false);
    
    // both balance0 and balance1 have to be right to pass both checks of input0 and input1
    expect(testMerge(0, expectedBalance0, expectedBalance1)).to.equal(true);
    expect(testMerge(0, expectedBalance0, expectedBalance1)).to.equal(true);
  });
});
