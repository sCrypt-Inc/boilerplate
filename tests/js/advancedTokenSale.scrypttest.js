const { expect } = require('chai');
const { bsv, buildContractClass, getPreimage, toHex, num2bin, SigHashPreimage, PubKeyHash, Bytes } = require('scryptlib');
const {
  inputIndex,
  inputSatoshis,
  DataLen,
  compileContract,
  emptyPublicKey,
  newTx
} = require('../../helper');


const Signature = bsv.crypto.Signature



// Token price is 1000 satoshis each
// NOTE: a price that is too low could run afoul of dust policy
const SATS_PER_TOKEN = 1000n


const privateKeys = [1,1,1,1,1].map(k => new bsv.PrivateKey.fromRandom())
const publicKeys = new Array(privateKeys.length)
const pkhs = new Array(privateKeys.length)

for (k = 0; k < privateKeys.length; k++) {
  publicKeys[k] = bsv.PublicKey.fromPrivateKey(privateKeys[k])
  pkhs[k] = bsv.crypto.Hash.sha256ripemd160(publicKeys[k].toBuffer())
}


describe('Test sCrypt contract Counter In Javascript', () => {
  let seller, preimage, result

  before(() => {
    const AdvancedTokenSale = buildContractClass(compileContract('advancedTokenSale.scrypt'))
    seller = new AdvancedTokenSale(SATS_PER_TOKEN);

    // append state as passive data
    seller.setDataPartInASM(emptyPublicKey + "00");
    
  });

  function testBuy(numBought, pkh, publicKey) {
    const tx = newTx();
    const newState = [seller.dataPart.toASM(),  toHex(publicKey) + num2bin(numBought, DataLen)].join(' ');

    const newLockingScript = [seller.codePart.toASM(), newState].join(' ')
  
    const changeAmount = inputSatoshis - Number(numBought) * Number(SATS_PER_TOKEN)
    const outputAmount = inputSatoshis + Number(numBought) * Number(SATS_PER_TOKEN)

    // counter output
    tx.addOutput(new bsv.Transaction.Output({
      script: bsv.Script.fromASM(newLockingScript),
      satoshis: outputAmount
    }))

    // change output
    tx.addOutput(new bsv.Transaction.Output({
      script: bsv.Script.buildPublicKeyHashOut(publicKey.toAddress()),
      satoshis: changeAmount
    }))

    preimage = getPreimage(tx, seller.lockingScript, inputSatoshis, 0, Signature.ANYONECANPAY_ALL)


    const context = { tx, inputIndex, inputSatoshis }
    result = seller.buy(SigHashPreimage(toHex(preimage)), PubKeyHash(toHex(pkh)), BigInt(changeAmount), Bytes(toHex(publicKey)), numBought).verify(context)
    expect(result.success, result.error).to.be.true;
    return newState;
  }



  it('should succeed when pushing right preimage & amount', () => {
    // any contract that includes checkSig() must be verified in a given context

    let newState = testBuy(1n, pkhs[0], publicKeys[0]);

    seller.setDataPart(newState);
    newState  = testBuy(3n, pkhs[1], publicKeys[1])
    seller.setDataPart(newState);
    newState  = testBuy(10n, pkhs[2], publicKeys[2])

    seller.setDataPart(newState);
    newState  = testBuy(2n, pkhs[3], publicKeys[3])
  });

});
