

const { expect } = require('chai');
const { compileContract, newTx} = require('../../helper');
const {  buildContractClass, Bool, signTx, Int, SigHashPreimage, bsv, toHex, getPreimage, PubKeyHash, PubKey } = require('scryptlib');
const inputIndex = 0;
const inputSatoshis = 100000;

const outputAmount = 222222

const Auction = buildContractClass(compileContract('auction.scrypt'));

const privateKeyHighestBid = new bsv.PrivateKey.fromRandom('testnet');
const publicKeyHighestBid = bsv.PublicKey.fromPrivateKey(privateKeyHighestBid);
const publicKeyHashHighestBid = bsv.crypto.Hash.sha256ripemd160(publicKeyHighestBid.toBuffer());
const addressHighestBid = privateKeyHighestBid.toAddress();


const privateKeyAuctioner = new bsv.PrivateKey.fromRandom('testnet');
const publicKeyAuctioner = bsv.PublicKey.fromPrivateKey(privateKeyAuctioner);

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

    const auction = new Auction(new PubKeyHash(toHex(publicKeyHashHighestBid)), new PubKey(toHex(publicKeyAuctioner)), auctionDeadline);
    it('should call success', () => {


        let newLockingScript = auction.getNewStateScript({
            bidder: new PubKeyHash(toHex(publicKeyHashNewBid))
        })

        const tx = newTx(inputSatoshis);


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

        const result1 = auction.bid(new PubKeyHash(toHex(publicKeyHashNewBid)), bid, changeSats, new SigHashPreimage(toHex(preimage))).verify()
        expect(result1.success, result1.error).to.be.true


    });

    it('should close success', () => {

        const tx = newTx(inputSatoshis);



        const today = Math.round( new Date().valueOf() / 1000 );

        tx.addOutput(new bsv.Transaction.Output({
            script: bsv.Script.buildPublicKeyHashOut(addressNewBid),
            satoshis: changeSats
        }))
        .setLockTime(today)

        const preimage = getPreimage(tx, auction.lockingScript, inputSatoshis)

        auction.txContext = {
            tx,
            inputIndex,
            inputSatoshis
        }
        const sig = signTx(tx, privateKeyAuctioner, auction.lockingScript, inputSatoshis)

        const result1 = auction.close(sig, preimage).verify()
        expect(result1.success, result1.error).to.be.true

    })

})
