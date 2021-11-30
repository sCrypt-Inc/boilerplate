const { expect } = require('chai');
const { bsv, buildContractClass, toHex, getPreimage, num2bin, PubKey, SigHashPreimage } = require('scryptlib');
const { inputIndex, inputSatoshis, newTx, compileContract, DataLen } = require('../../helper');

const tx = newTx();

describe('Test sCrypt contract TokenSale In Javascript', () => {
  let tokenSale, getPreimageAfterPurchase, result

  const privateKey1 = new bsv.PrivateKey.fromRandom('testnet')
  const publicKey1 = bsv.PublicKey.fromPrivateKey(privateKey1)
  const numTokens = 21
  const tokenPriceInSatoshis = 100

  before(() => {
    const TokenSale = buildContractClass(compileContract('tokenSale.scrypt'))
    tokenSale = new TokenSale(tokenPriceInSatoshis)

    // initial empty state
    tokenSale.setDataPart('')

    getPreimageAfterPurchase = (publicKey) => {

      const newLockingScript = [tokenSale.codePart.toASM(), toHex(publicKey) + num2bin(numTokens, DataLen)].join(' ')
      tx.addOutput(new bsv.Transaction.Output({
        script: bsv.Script.fromASM(newLockingScript),
        satoshis: inputSatoshis + numTokens * tokenPriceInSatoshis
      }))

      return getPreimage(tx, tokenSale.lockingScript, inputSatoshis)
    }
  });

  it('should succeed when publicKey1 buys tokens', () => {
    // any contract that includes checkSig() must be verified in a given context
    const context = { tx, inputIndex, inputSatoshis }
    const preimage = getPreimageAfterPurchase(publicKey1)
    result = tokenSale.buy(
        new PubKey(toHex(publicKey1)),
        numTokens,
        new SigHashPreimage(toHex(preimage))
      ).verify(context)
    expect(result.success, result.error).to.be.true
  });
 });
