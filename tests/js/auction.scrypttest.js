

const { expect } = require('chai');
const { compileContract, newTx} = require('../../helper');
const {  buildContractClass, Bool, Bytes, Int, SigHashPreimage, bsv, toHex, getPreimage, Ripemd160, PubKey } = require('scryptlib');
const inputIndex = 0;
const inputSatoshis = 100000;

const outputAmount = 222222

const Auction = buildContractClass(compileContract('auction.scrypt'));

const privateKeyHighestBid = new bsv.PrivateKey.fromRandom('testnet');
const publicKeyHighestBid = bsv.PublicKey.fromPrivateKey(privateKeyHighestBid);
const publicKeyHashHighestBid = bsv.crypto.Hash.sha256ripemd160(publicKeyHighestBid.toBuffer());
const addressHighestBid = privateKeyHighestBid.toAddress();


const privateKeyAuctioner = new bsv.PrivateKey.fromRandom('testnet');
const publicKeyAuctioner = bsv.PublicKey.fromPrivateKey(privateKeyHighestBid);


const privateKeyNewBid = new bsv.PrivateKey.fromRandom('testnet');
const publicKeyNewBid = bsv.PublicKey.fromPrivateKey(privateKeyNewBid);
const publicKeyHashNewBid = bsv.crypto.Hash.sha256ripemd160(publicKeyNewBid.toBuffer());
const addressNewBid = privateKeyNewBid.toAddress();
const bid = inputSatoshis + 10000;

const FEE = 5000;

const payinputSatoshis = 200000;

const changeSats = payinputSatoshis - bid - FEE;

describe('auction', () => {
    const onedayAgo = new Date("2020-01-03");
    const auctionDeadline = Math.round( onedayAgo.valueOf() / 1000 );
    const higherBid  = inputSatoshis + 10000;

    const auction = new Auction(new Ripemd160(toHex(publicKeyHashHighestBid)), new PubKey(toHex(publicKeyAuctioner)), auctionDeadline);
    it('should call success', () => {


        let newLockingScript = auction.getNewStateScript({
            bidder: new Ripemd160(toHex(publicKeyHashNewBid))
        })

        const tx = newTx(inputSatoshis);

        tx.addInput(new bsv.Transaction.Input.PublicKeyHash({
            prevTxId:  'f6c8b716d9968ef65f8724240882a0f6bdd4bb942fb27cdfbb3c0701331c70c2',
            outputIndex: 0,
            script: new bsv.Script(), // placeholder
          }), bsv.Script.buildPublicKeyHashOut(addressNewBid).toHex(), payinputSatoshis)


        tx.addOutput(new bsv.Transaction.Output({
            script: newLockingScript,
            satoshis: bid
        }))


        tx.addOutput(new bsv.Transaction.Output({
            script: bsv.Script.buildPublicKeyHashOut(addressHighestBid),
            satoshis: inputSatoshis
        }))

        tx.addOutput(new bsv.Transaction.Output({
            script: bsv.Script.buildPublicKeyHashOut(addressNewBid),
            satoshis: changeSats
        }))


        const preimage = getPreimage(tx, auction.lockingScript, inputSatoshis)

        auction.txContext = {
            tx,
            inputIndex,
            inputSatoshis
        }

        const result1 = auction.bid(new Ripemd160(toHex(publicKeyHashNewBid)), bid, changeSats, new SigHashPreimage(toHex(preimage))).verify()
        expect(result1.success, result1.error).to.be.true


    });

})
