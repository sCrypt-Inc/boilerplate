const path = require('path');
const { expect } = require('chai');
const { buildContractClass, bsv } = require('scrypttest');

const { inputIndex, inputSatoshis, tx, signTx, getPreimage, toHex, num2bin } = require('../testHelper');

// make a copy since it will be mutated
let tx_ = bsv.Transaction.shallowCopy(tx)

// number of bytes to denote token amount
const ByteLen = 1
const outputAmount = 22222
    
describe('Test sCrypt contract UTXO Token In Javascript', () => {
  let token
  let getPreimageAfterTransfer
  let lockingScriptCodePart

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
    // initial supply 100 tokens: publicKey1 has 100, publicKey2 0
    const lockingScript = lockingScriptCodePart + ' OP_RETURN ' + toHex(publicKey1) + num2bin(10, ByteLen) + num2bin(90, ByteLen)
    token.setLockingScript(lockingScript)
    
    getPreimageAfterTransfer = (balance0, balance1) => {
      const newLockingScript0 = lockingScriptCodePart + ' OP_RETURN ' + toHex(publicKey2) + num2bin(0, ByteLen) + num2bin(balance0, ByteLen)
      tx_.addOutput(new bsv.Transaction.Output({
        script: bsv.Script.fromASM(newLockingScript0),
        satoshis: outputAmount
      }))
      const newLockingScript1 = lockingScriptCodePart + ' OP_RETURN ' + toHex(publicKey3) + num2bin(0, ByteLen) + num2bin(balance1, ByteLen)
      tx_.addOutput(new bsv.Transaction.Output({
        script: bsv.Script.fromASM(newLockingScript1),
        satoshis: outputAmount
      }))

      return getPreimage(tx_, lockingScript)
    }

    // TODO: refactor as in merge
    let preimage = getPreimageAfterTransfer(60, 40)
    const sig1 = signTx(tx_, privateKey1, token.getLockingScript())
    expect(token.split(toHex(sig1), toHex(publicKey2), 60, outputAmount, toHex(publicKey3), 40, outputAmount, toHex(preimage))).to.equal(true);
    
    // unauthorized
    const sig2 = signTx(tx_, privateKey2, token.getLockingScript())
    expect(token.split(toHex(sig2), toHex(publicKey2), 60, outputAmount, toHex(publicKey3), 40, outputAmount, toHex(preimage))).to.equal(false);
    
    // mismatch w/ preimage
    expect(token.split(toHex(sig1), toHex(publicKey2), 60 - 1, outputAmount, toHex(publicKey3), 40, outputAmount, toHex(preimage))).to.equal(false);
    
    // token inbalance after splitting
    preimage = getPreimageAfterTransfer(60 + 1, 40)
    expect(token.split(toHex(sig1), toHex(publicKey2), 60 + 1, outputAmount, toHex(publicKey3), 40, outputAmount, toHex(preimage))).to.equal(false);
  });

  it('should succeed when two tokens are merged', () => {
    const x0 = 10
    const x1 = 50
    const expectedBalance0 = x0 + x1
    const lockingScript0 = lockingScriptCodePart + ' OP_RETURN ' + toHex(publicKey1) + num2bin(x0, ByteLen) + num2bin(x1, ByteLen)
    
    const y0 = 13
    const y1 = 27
    const expectedBalance1 = y0 + y1
    const lockingScript1 = lockingScriptCodePart + ' OP_RETURN ' + toHex(publicKey2) + num2bin(y0, ByteLen) + num2bin(y1, ByteLen)
    
    const testMerge = (inputIndex, balance0, balance1) => {
      tx_ = new bsv.Transaction()

      tx_.addInput(new bsv.Transaction.Input({
        prevTxId: 'a477af6b2667c29670467e4e0728b685ee07b240235771862318e29ddbe58458',
        outputIndex: 0,
        script: ''
      }), bsv.Script.fromASM(lockingScript0), inputSatoshis)
      
      tx_.addInput(new bsv.Transaction.Input({
        prevTxId: 'a477af6b2667c29670467e4e0728b685ee07b240235771862318e29ddbe58458',
        outputIndex: 1,
        script: ''
      }), bsv.Script.fromASM(lockingScript1), inputSatoshis)

      const newLockingScript0 = lockingScriptCodePart + ' OP_RETURN ' + toHex(publicKey3) + num2bin(balance0, ByteLen) + num2bin(balance1, ByteLen)
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
