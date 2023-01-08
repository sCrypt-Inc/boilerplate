const { expect } = require('chai');
const { bsv, buildContractClass, signTx, getPreimage, toHex, PubKey, Sig, Sha256, PubKeyHash } = require('scryptlib');
const { compileContract, fixLowS, checkLowS, inputIndex, inputSatoshis } = require('../../helper.js');

const agentKey = bsv.PrivateKey.fromRandom('testnet');
const approveOutputBytes = "d3070000000000001976a9140f68389668c7e680d62e2446866ea1ca668e7fa188ac";
const approveOutputScript = "76a9140f68389668c7e680d62e2446866ea1ca668e7fa188ac";
const refundOutputBytes = "d3070000000000001976a9148c5a40d16db46e3fc419fd26105bb159cd2863b788ac";
const refundOutputScript = "76a9148c5a40d16db46e3fc419fd26105bb159cd2863b788ac";
const expireKey = bsv.PrivateKey.fromRandom('testnet');
const expiration = 610000n;
const outputAmount = 2003;
const wrongLockScript = "76a91486ead68829c1249844758bb3169ee19c4263c5cd88ac";
const wrongKey = bsv.PrivateKey.fromRandom('testnet');
let EnforceAgentBitcoinTransfer;
let agentKeyHash, approveOutputsHash, refundOutputsHash, expireKeyHash;

describe('Test EnforceAgentBitcoinTransfer', () => {
  let contract, result;

  before(() => {
    EnforceAgentBitcoinTransfer = buildContractClass(compileContract('enforceAgentBitcoinTransfer.scrypt'));
    agentKeyHash = PubKeyHash(toHex(bsv.crypto.Hash.sha256ripemd160(agentKey.publicKey.toBuffer())));
    approveOutputsHash = Sha256(toHex(bsv.crypto.Hash.sha256sha256(Buffer.from(approveOutputBytes, 'hex'))));
    refundOutputsHash = Sha256(toHex(bsv.crypto.Hash.sha256sha256(Buffer.from(refundOutputBytes, 'hex'))));
    expireKeyHash = PubKeyHash(toHex(bsv.crypto.Hash.sha256ripemd160(expireKey.publicKey.toBuffer())));
    contract = new EnforceAgentBitcoinTransfer(agentKeyHash, approveOutputsHash, refundOutputsHash, expireKeyHash, expiration);
  });

  it('Call approve', () => {
    const tx = createTx(approveOutputScript, outputAmount);
    fixLowS(tx, contract.lockingScript, inputSatoshis, inputIndex);

    const preimage = getPreimage(tx, contract.lockingScript, inputSatoshis, inputIndex);
    const sig = signTx(tx, agentKey, contract.lockingScript, inputSatoshis, inputIndex);

    contract.txContext = { tx, inputIndex, inputSatoshis };

    const res = contract.approve(Sig(toHex(sig)), PubKey(toHex(agentKey.publicKey)), preimage);
    result = res.verify();
    expect(result.success, result.error).to.be.true;
  });

  it('Call approve wrong key', () => {
    const tx = createTx(approveOutputScript, outputAmount);
    fixLowS(tx, contract.lockingScript, inputSatoshis, inputIndex);

    const preimage = getPreimage(tx, contract.lockingScript, inputSatoshis, inputIndex);
    const sig = signTx(tx, wrongKey, contract.lockingScript, inputSatoshis, inputIndex);

    contract.txContext = { tx, inputIndex, inputSatoshis };

    const res = contract.approve(Sig(toHex(sig)), PubKey(toHex(wrongKey.publicKey)), preimage);
    result = res.verify();
    expect(result.success, result.error).to.be.false;
  });

  it('Call approve wrong sig', () => {
    const tx = createTx(approveOutputScript, outputAmount);
    fixLowS(tx, contract.lockingScript, inputSatoshis, inputIndex);

    const preimage = getPreimage(tx, contract.lockingScript, inputSatoshis, inputIndex);
    const sig = signTx(tx, wrongKey, contract.lockingScript, inputSatoshis, inputIndex);

    contract.txContext = { tx, inputIndex, inputSatoshis };

    const res = contract.approve(Sig(toHex(sig)), PubKey(toHex(agentKey.publicKey)), preimage);
    result = res.verify();
    expect(result.success, result.error).to.be.false;
  });

  it('Call approve with wrong output', () => {
    const tx = createTx(wrongLockScript, outputAmount);
    fixLowS(tx, contract.lockingScript, inputSatoshis, inputIndex);

    const preimage = getPreimage(tx, contract.lockingScript, inputSatoshis, inputIndex);
    const sig = signTx(tx, agentKey, contract.lockingScript, inputSatoshis, inputIndex);

    contract.txContext = { tx, inputIndex, inputSatoshis };

    const res = contract.approve(Sig(toHex(sig)), PubKey(toHex(agentKey.publicKey)), preimage);
    result = res.verify();
    expect(result.success, result.error).to.be.false;
  });

  it('Call refund', () => {
    const tx = createTx(refundOutputScript, outputAmount);
    fixLowS(tx, contract.lockingScript, inputSatoshis, inputIndex);

    const preimage = getPreimage(tx, contract.lockingScript, inputSatoshis, inputIndex);
    const sig = signTx(tx, agentKey, contract.lockingScript, inputSatoshis, inputIndex);

    contract.txContext = { tx, inputIndex, inputSatoshis };

    const res = contract.refund(Sig(toHex(sig)), PubKey(toHex(agentKey.publicKey)), preimage);
    result = res.verify();
    expect(result.success, result.error).to.be.true;
  });

  it('Call refund with wrong key', () => {
    const tx = createTx(wrongLockScript, outputAmount);
    fixLowS(tx, contract.lockingScript, inputSatoshis, inputIndex);
  
    const preimage = getPreimage(tx, contract.lockingScript, inputSatoshis, inputIndex);
    const sig = signTx(tx, wrongKey, contract.lockingScript, inputSatoshis, inputIndex);
  
    contract.txContext = { tx, inputIndex, inputSatoshis };
  
    const res = contract.refund(Sig(toHex(sig)), PubKey(toHex(wrongKey.publicKey)), preimage);
    result = res.verify();
    expect(result.success, result.error).to.be.false;
  });

  it('Call refund with wrong sig', () => {
    const tx = createTx(wrongLockScript, outputAmount);
    fixLowS(tx, contract.lockingScript, inputSatoshis, inputIndex);
  
    const preimage = getPreimage(tx, contract.lockingScript, inputSatoshis, inputIndex);
    const sig = signTx(tx, wrongKey, contract.lockingScript, inputSatoshis, inputIndex);
  
    contract.txContext = { tx, inputIndex, inputSatoshis };
  
    const res = contract.refund(Sig(toHex(sig)), PubKey(toHex(agentKey.publicKey)), preimage);
    result = res.verify();
    expect(result.success, result.error).to.be.false;
  });

  it('Call refund with wrong output', () => {
    const tx = createTx(wrongLockScript, outputAmount);
    fixLowS(tx, contract.lockingScript, inputSatoshis, inputIndex);
  
    const preimage = getPreimage(tx, contract.lockingScript, inputSatoshis, inputIndex);
    const sig = signTx(tx, agentKey, contract.lockingScript, inputSatoshis, inputIndex);
  
    contract.txContext = { tx, inputIndex, inputSatoshis };
  
    const res = contract.refund(Sig(toHex(sig)), PubKey(toHex(agentKey.publicKey)), preimage);
    result = res.verify();
    expect(result.success, result.error).to.be.false;
  });

  it('Call expire', () => {
    const tx = createTx(refundOutputScript, outputAmount);
    tx.nLockTime = Number(expiration);
    fixLowS(tx, contract.lockingScript, inputSatoshis, inputIndex);

    const preimage = getPreimage(tx, contract.lockingScript, inputSatoshis, inputIndex);
    const sig = signTx(tx, expireKey, contract.lockingScript, inputSatoshis, inputIndex);

    contract.txContext = { tx, inputIndex, inputSatoshis };

    const res = contract.expire(Sig(toHex(sig)), PubKey(toHex(expireKey.publicKey)), preimage);
    result = res.verify();
    expect(result.success, result.error).to.be.true;
  });

  it('Call expire earlier lock time', () => {
    const tx = createTx(refundOutputScript, outputAmount);
    tx.nLockTime = Number(expiration-1n);
    fixLowS(tx, contract.lockingScript, inputSatoshis, inputIndex);

    const preimage = getPreimage(tx, contract.lockingScript, inputSatoshis, inputIndex);
    const sig = signTx(tx, expireKey, contract.lockingScript, inputSatoshis, inputIndex);

    contract.txContext = { tx, inputIndex, inputSatoshis };

    const res = contract.expire(Sig(toHex(sig)), PubKey(toHex(expireKey.publicKey)), preimage);
    result = res.verify();
    expect(result.success, result.error).to.be.false;
  });

  it('Call expire with max sequence', () => {
    const tx = createTx(refundOutputScript, outputAmount);
    tx.nLockTime = Number(expiration);
    tx.inputs[0].sequenceNumber = 0xffffffff;
    let maxSequenceContract;

    for (i=0;i<25;i++) {
        // Modify agent key to get tx to work with low s.
        const maxSequenceAgentKey = bsv.PrivateKey.fromRandom('testnet');
        const maxSequenceAgentKeyHash = PubKeyHash(toHex(bsv.crypto.Hash.sha256ripemd160(maxSequenceAgentKey.publicKey.toBuffer())));
        maxSequenceContract = new EnforceAgentBitcoinTransfer(maxSequenceAgentKeyHash, approveOutputsHash, refundOutputsHash, expireKeyHash, expiration);
        if (checkLowS(tx, maxSequenceContract.lockingScript, inputSatoshis, inputIndex)) {
            break;
        }
    }

    const preimage = getPreimage(tx, maxSequenceContract.lockingScript, inputSatoshis, inputIndex);
    const sig = signTx(tx, expireKey, maxSequenceContract.lockingScript, inputSatoshis, inputIndex);

    maxSequenceContract.txContext = { tx, inputIndex, inputSatoshis };

    const res = maxSequenceContract.expire(Sig(toHex(sig)), PubKey(toHex(expireKey.publicKey)), preimage);
    result = res.verify();
    expect(result.success, result.error).to.be.false;
  });

  it('Call expire with wrong key', () => {
    const tx = createTx(refundOutputScript, outputAmount);
    tx.nLockTime = Number(expiration);
    fixLowS(tx, contract.lockingScript, inputSatoshis, inputIndex);

    const preimage = getPreimage(tx, contract.lockingScript, inputSatoshis, inputIndex);
    const sig = signTx(tx, wrongKey, contract.lockingScript, inputSatoshis, inputIndex);

    contract.txContext = { tx, inputIndex, inputSatoshis };

    const res = contract.expire(Sig(toHex(sig)), PubKey(toHex(wrongKey.publicKey)), preimage);
    result = res.verify();
    expect(result.success, result.error).to.be.false;
  });

  it('Call expire with wrong signature', () => {
    const tx = createTx(refundOutputScript, outputAmount);
    tx.nLockTime = Number(expiration);
    fixLowS(tx, contract.lockingScript, inputSatoshis, inputIndex);

    const preimage = getPreimage(tx, contract.lockingScript, inputSatoshis, inputIndex);
    const sig = signTx(tx, wrongKey, contract.lockingScript, inputSatoshis, inputIndex);

    contract.txContext = { tx, inputIndex, inputSatoshis };

    const res = contract.expire(Sig(toHex(sig)), PubKey(toHex(expireKey.publicKey)), preimage);
    result = res.verify();
    expect(result.success, result.error).to.be.false;
  });

});

function createTx(script, amount) {
    const result = new bsv.Transaction();

    result.addInput(new bsv.Transaction.Input({
      prevTxId: 'a477af6b2667c29670467e4e0728b685ee07b240235771862318e29ddbe58458',
      outputIndex: 0,
      script: '',
      sequenceNumber: 1, // Required for lock time
    }), '', inputSatoshis);

    result.addOutput(new bsv.Transaction.Output({
      script: bsv.Script.fromHex(script),
      satoshis: amount,
    }));

    return result;
}
