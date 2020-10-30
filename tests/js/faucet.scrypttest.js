const { expect } = require('chai');
const { bsv, buildContractClass, getPreimage, toHex, num2bin, SigHashPreimage, Ripemd160 } = require('scryptlib');

const {
  inputIndex,
  inputSatoshis,
  tx,
  compileContract
} = require('../../helper');

// make a copy since it will be mutated
const privateKey = new bsv.PrivateKey.fromRandom('testnet')
const publicKey = privateKey.publicKey
const pkh = bsv.crypto.Hash.sha256ripemd160(publicKey.toBuffer())

describe('Deposit', ()=>{
  describe('Without change', () => {
    let faucet, preimage, result, tx_;
    const depositAmount = 100000;
    const outputAmount = depositAmount + inputSatoshis;
  
    before(() => {
      tx_ = bsv.Transaction.shallowCopy(tx)
      const Faucet = buildContractClass(compileContract('faucet.scrypt'))
      faucet = new Faucet();
      faucet.setDataPart(num2bin(1602553516, 4));
  
      tx_.addOutput(new bsv.Transaction.Output({
        script: faucet.lockingScript,
        satoshis: outputAmount
      }))
  
      preimage = getPreimage(tx_, faucet.lockingScript.toASM(), inputSatoshis);
  
      // set txContext for verification
      faucet.txContext = {
        tx: tx_,
        inputIndex,
        inputSatoshis
      }
    });
  
    it('newContractOutputSatoshis = depositSatoshis + oldContractInputSatoshis, should successed', () => {
      result = faucet.deposit(new SigHashPreimage(toHex(preimage)), depositAmount, new Ripemd160(toHex(pkh)), 0).verify();
      expect(result.success, result.error).to.be.true;
    });
  
    it('newContractOutputSatoshis > depositSatoshis + oldContractInputSatoshis, should fail', () => {
      result = faucet.deposit(new SigHashPreimage(toHex(preimage)), depositAmount - 1, new Ripemd160(toHex(pkh)), 0).verify();
      expect(result.success, result.error).to.be.false;
    });

    it('should no change when change amount < 546', ()=>{
      result = faucet.deposit(new SigHashPreimage(toHex(preimage)), depositAmount, new Ripemd160(toHex(pkh)), 546).verify();
      expect(result.success, result.error).to.be.true;
    });
  });
  
  describe('With change', () => {
    let faucet, preimage, result, tx_;
  
    const depositAmount = 100000;
    const outputAmount = depositAmount + inputSatoshis;
    const changeAmount = 547;
  
    before(() => {
      tx_ = bsv.Transaction.shallowCopy(tx)
      const Faucet = buildContractClass(compileContract('faucet.scrypt'))
      faucet = new Faucet();
      faucet.setDataPart(num2bin(1602553516, 4));
  
      tx_.addOutput(new bsv.Transaction.Output({
        script: faucet.lockingScript,
        satoshis: outputAmount
      }));
  
      tx_.addOutput(new bsv.Transaction.Output({
        script: bsv.Script.buildPublicKeyHashOut(privateKey.toAddress()),
        satoshis: changeAmount
      }));
  
      preimage = getPreimage(tx_, faucet.lockingScript.toASM(), inputSatoshis)
      faucet.txContext = {
        tx: tx_,
        inputIndex,
        inputSatoshis
      }
    });
  
    it('newContractOutputSatoshis = depositSatoshis + oldContractInputSatoshis, should successed.', ()=>{
      result = faucet.deposit(new SigHashPreimage(toHex(preimage)), depositAmount, new Ripemd160(toHex(pkh)), changeAmount).verify();
      expect(result.success, result.error).to.be.true;
    });
  
    it('changeSatoshisParam != changeOutputSatoshis, should fail', ()=>{
      result = faucet.deposit(new SigHashPreimage(toHex(preimage)), depositAmount, new Ripemd160(toHex(pkh)), changeAmount+1).verify();
      expect(result.success, result.error).to.be.false;
    });
  });
});

describe('Withdraw', () => {
  let faucet, preimage, result, tx_;
  const withdrawAmount = 2000000;
  const fee = 3000;
  const inputSatoshis = 10000000;
  const outputAmount = inputSatoshis - withdrawAmount - fee;
  const matureTime = 1602553516;

  before(() => {
    tx_ = bsv.Transaction.shallowCopy(tx)
    const Faucet = buildContractClass(compileContract('faucet.scrypt'))
    faucet = new Faucet();
    faucet.setDataPart(num2bin(matureTime, 4));
  });

  it('Everything is OK, should successed', ()=>{
    tx_.addOutput(new bsv.Transaction.Output({
      script: bsv.Script.fromASM(faucet.codePart.toASM() + ' ' + num2bin(matureTime + 300, 4)),
      satoshis: outputAmount
    }));

    tx_.addOutput(new bsv.Transaction.Output({
      script: bsv.Script.buildPublicKeyHashOut(privateKey.toAddress()),
      satoshis: withdrawAmount
    }));
    tx_.inputs[0].sequenceNumber = 0xFFFFFFFE;
    tx_.nLockTime = matureTime + 300;

    preimage = getPreimage(tx_, faucet.lockingScript.toASM(), inputSatoshis);

    // set txContext for verification
    faucet.txContext = {
      tx: tx_,
      inputIndex,
      inputSatoshis
    }
    result = faucet.withdraw(new SigHashPreimage(toHex(preimage)), new Ripemd160(toHex(pkh))).verify();
    expect(result.success, result.error).to.be.true;
  });

  it('The increase of matureTime is not 300, should fail', ()=>{
    tx_.addOutput(new bsv.Transaction.Output({
      script: bsv.Script.fromASM(faucet.codePart.toASM() + ' ' + num2bin(matureTime + 299, 4)),
      satoshis: outputAmount
    }));

    tx_.addOutput(new bsv.Transaction.Output({
      script: bsv.Script.buildPublicKeyHashOut(privateKey.toAddress()),
      satoshis: withdrawAmount
    }));
    tx_.inputs[0].sequenceNumber = 0xFFFFFFFE;
    tx_.nLockTime = matureTime + 299;

    preimage = getPreimage(tx_, faucet.lockingScript.toASM(), inputSatoshis);

    // set txContext for verification
    faucet.txContext = {
      tx: tx_,
      inputIndex,
      inputSatoshis
    };

    result = faucet.withdraw(new SigHashPreimage(toHex(preimage)), new Ripemd160(toHex(pkh))).verify();
    expect(result.success, result.error).to.be.false;
  });

  it('matureTime != nLockTime, should fail', ()=>{
    tx_.addOutput(new bsv.Transaction.Output({
      script: bsv.Script.fromASM(faucet.codePart.toASM() + ' ' + num2bin(matureTime + 299, 4)),
      satoshis: outputAmount
    }));

    tx_.addOutput(new bsv.Transaction.Output({
      script: bsv.Script.buildPublicKeyHashOut(privateKey.toAddress()),
      satoshis: withdrawAmount
    }));
    tx_.inputs[0].sequenceNumber = 0xFFFFFFFE;
    tx_.nLockTime = matureTime + 300;

    preimage = getPreimage(tx_, faucet.lockingScript.toASM(), inputSatoshis);

    // set txContext for verification
    faucet.txContext = {
      tx: tx_,
      inputIndex,
      inputSatoshis
    };

    result = faucet.withdraw(new SigHashPreimage(toHex(preimage)), new Ripemd160(toHex(pkh))).verify();
    expect(result.success, result.error).to.be.false;
  });
});