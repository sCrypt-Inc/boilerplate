const { expect } = require('chai');
const { bsv, buildContractClass, getPreimage, toHex, num2bin, SigHashPreimage, Ripemd160, Bytes } = require('scryptlib');
const {
  inputIndex,
  inputSatoshis,
  DataLen,
  compileContract,
  emptyPublicKey,
  newTx
} = require('../../helper');


const Signature = bsv.crypto.Signature
// Note: ANYONECANPAY
const sighashType = Signature.SIGHASH_ANYONECANPAY | Signature.SIGHASH_ALL | Signature.SIGHASH_FORKID



// Token price is 1000 satoshis each
// NOTE: a price that is too low could run afoul of dust policy
const SATS_PER_TOKEN = 1000


const privateKeys = [1,1,1,1,1].map(k => new bsv.PrivateKey.fromRandom())
const publicKeys = new Array(privateKeys.length)
const pkhs = new Array(privateKeys.length)

for (k = 0; k < privateKeys.length; k++) {
  publicKeys[k] = bsv.PublicKey.fromPrivateKey(privateKeys[k])
  pkhs[k] = bsv.crypto.Hash.sha256ripemd160(publicKeys[k].toBuffer())
}


describe('Test sCrypt contract Counter In Javascript', () => {
  let saler, preimage, result

  before(() => {
    const AdvancedTokenSale = buildContractClass(compileContract('advancedTokenSale.scrypt'))
    saler = new AdvancedTokenSale(SATS_PER_TOKEN);

    // append state as passive data
    saler.setDataPart(emptyPublicKey + "00");
    
  });

  function testBuy(numBought, pkh, publicKey) {
    const tx = newTx();
    const prevLockingScript = saler.lockingScript.toASM()
    const newState = [saler.dataPart.toASM(),  toHex(publicKey) + num2bin(numBought, DataLen)].join(' ');

    const newLockingScript = [saler.codePart.toASM(), newState].join(' ')
  
    const changeAmount = inputSatoshis - numBought * SATS_PER_TOKEN
    const outputAmount = inputSatoshis + numBought * SATS_PER_TOKEN

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

    preimage = getPreimage(tx, prevLockingScript, inputSatoshis, 0, sighashType)


    const context = { tx, inputIndex, inputSatoshis }
    result = saler.buy(new SigHashPreimage(toHex(preimage)), new Ripemd160(toHex(pkh)), changeAmount, new Bytes(toHex(publicKey)), numBought).verify(context)
    expect(result.success, result.error).to.be.true;
    return newState;
  }



  it('should succeed when pushing right preimage & amount', () => {
    // any contract that includes checkSig() must be verified in a given context

    let newState = testBuy(1, pkhs[0], publicKeys[0]);

    saler.setDataPart(newState);
    newState  = testBuy(3, pkhs[1], publicKeys[1])
    saler.setDataPart(newState);
    newState  = testBuy(10, pkhs[2], publicKeys[2])

    saler.setDataPart(newState);
    newState  = testBuy(2, pkhs[3], publicKeys[3])
  });

});
