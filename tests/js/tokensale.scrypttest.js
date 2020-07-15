const path = require('path');
const { expect } = require('chai');
const { buildContractClass, bsv } = require('scrypttest');

const { inputIndex, inputSatoshis, tx, getPreimage, toHex, num2bin, ByteLen } = require('../testHelper');

// make a copy since it will be mutated
const tx_ = bsv.Transaction.shallowCopy(tx)

describe('Test sCrypt contract TokenSale In Javascript', () => {
  let tokenSale
  let getPreimageAfterPurchase

  const privateKey1 = new bsv.PrivateKey.fromRandom('testnet')
  const publicKey1 = bsv.PublicKey.fromPrivateKey(privateKey1)
  const numTokens = 21
  const tokenPriceInSatoshis = 100

  before(() => {
    const TokenSale = buildContractClass(path.join(__dirname, '../../contracts/tokenSale.scrypt'), tx_, inputIndex, inputSatoshis)
    tokenSale = new TokenSale(tokenPriceInSatoshis)

    // code part
    const lockingScriptCodePart = tokenSale.getLockingScript()

    // initial supply 0
    const lockingScript = lockingScriptCodePart + ' OP_RETURN'
    tokenSale.setLockingScript(lockingScript)

    getPreimageAfterPurchase = (publicKey) => {
      const newLockingScript = lockingScript + ' ' + toHex(publicKey) + num2bin(numTokens, ByteLen)
      tx_.addOutput(new bsv.Transaction.Output({
        script: bsv.Script.fromASM(newLockingScript),
        satoshis: inputSatoshis + numTokens * tokenPriceInSatoshis
      }))

      return getPreimage(tx_, lockingScript)
    }
  });

  it('should succeed when publicKey1 buys tokens', () => {
    const preimage = getPreimageAfterPurchase(publicKey1)
    expect(tokenSale.buy(toHex(publicKey1), numTokens, toHex(preimage))).to.equal(true);
  });
});
