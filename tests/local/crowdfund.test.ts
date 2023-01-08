import { expect } from 'chai';
import { PubKey, PubKeyHash, Sig, SigHashPreimage, bsv, getPreimage, signTx, toHex } from 'scrypt-ts';
import { Crowdfund } from '../../src/contracts/crowdfund';
import { newTx, inputIndex, inputSatoshis, dummyUTXO } from './util/txHelper';


const privateKeyRecepient = bsv.PrivateKey.fromRandom('testnet');
const pkhRecepient = bsv.crypto.Hash.sha256ripemd160(privateKeyRecepient.publicKey.toBuffer())

const privateKeyContributor = bsv.PrivateKey.fromRandom('testnet')
const privateKeyPublickey = bsv.PublicKey.fromPrivateKey(privateKeyContributor)



describe('Test SmartContract `Crowdfund`', () => {

  before(async () => {
    await Crowdfund.compile(); // asm 
  })

  it('should collect fund success', async () => {
    const onedayAgo = new Date("2020-01-03");

    const deadline = Math.round(onedayAgo.valueOf() / 1000);

    let crowdfund = new Crowdfund(PubKeyHash(toHex(pkhRecepient)), PubKey(toHex(privateKeyPublickey)), BigInt(deadline), 10000n)


    const utxos = [dummyUTXO];

    // construct a transaction for deployment
    const deployTx = crowdfund.getDeployTx(utxos, 1);

    const raisedAmount = 10000n;
    const callTx = crowdfund.getCallCollectTx(deployTx, PubKeyHash(toHex(pkhRecepient)), raisedAmount);

    crowdfund.unlockFrom = {tx: callTx, inputIndex};
    const result = crowdfund.verify(self => {
      self.collect(raisedAmount);
    });
    
    expect(result.success).to.be.true
  })


  it('should collect fund fail if  raisedAmount not reach target', async () => {
    const onedayAgo = new Date("2020-01-03");

    const deadline = Math.round(onedayAgo.valueOf() / 1000);

    let crowdfund = new Crowdfund(PubKeyHash(toHex(pkhRecepient)), PubKey(toHex(privateKeyPublickey)), BigInt(deadline), 10000n)


    const utxos = [dummyUTXO];

    // construct a transaction for deployment
    const deployTx = crowdfund.getDeployTx(utxos, 1);

    const raisedAmount = 100n;

    expect(() => {
      crowdfund.getCallCollectTx(deployTx, PubKeyHash(toHex(pkhRecepient)), raisedAmount)
    }).to.throw(/Execution failed/)

  })


  it('should success when refund ', async () => {

    const deadline = Math.round(new Date("2020-01-03").valueOf() / 1000);

    let crowdfund = new Crowdfund(PubKeyHash(toHex(pkhRecepient)), PubKey(toHex(privateKeyPublickey)), BigInt(deadline), 10000n)


    const utxos = [dummyUTXO];

    // construct a transaction for deployment
    const deployTx = crowdfund.getDeployTx(utxos, 10000);

    const today = Math.round(new Date().valueOf() / 1000);

    const callTx = crowdfund.getCallRefundTx(deployTx, PubKeyHash(toHex(pkhRecepient)), privateKeyContributor, today);

    crowdfund.unlockFrom = {tx: callTx, inputIndex};
    const result = crowdfund.verify(self => {
      self.refund(Sig(callTx.getSignature(0) as string));
    });
    
    expect(result.success).to.be.true
  })

  it('should fail when refund before deadline ', async () => {

    const deadline = Math.round(new Date("2020-01-03").valueOf() / 1000);

    let crowdfund = new Crowdfund(PubKeyHash(toHex(pkhRecepient)), PubKey(toHex(privateKeyPublickey)), BigInt(deadline), 10000n)


    const utxos = [dummyUTXO];

    // construct a transaction for deployment
    const deployTx = crowdfund.getDeployTx(utxos, 10000);

    const beforeDeadline = Math.round(new Date("2020-01-01").valueOf() / 1000);


    expect(() => {
      crowdfund.getCallRefundTx(deployTx, PubKeyHash(toHex(pkhRecepient)), privateKeyContributor, beforeDeadline);
    }).to.throw(/Execution failed/)
  })



})