const {
  bsv,
  buildContractClass,
  getPreimage,
  toHex,
  num2bin,
  Bytes,
  signTx,
  SigHashPreimage,
  Ripemd160,
  PubKey
} = require('scryptlib');
const {
  loadDesc,
  sendTx,
  showError,
  deployContract,
  createInputFromPrevTx,
  fetchUtxos,
  sleep,
  compileContract
} = require('../helper');
const axios = require('axios')

const Signature = bsv.crypto.Signature
//const sighashType = Signature.SIGHASH_ANYONECANPAY | Signature.SIGHASH_ALL | Signature.SIGHASH_FORKID
const sighashType = Signature.SIGHASH_ALL | Signature.SIGHASH_FORKID

const {
  privateKey
} = require('../privateKey');

const auctionerPrivKey = privateKey;
const auctionerPubKey = new bsv.PublicKey.fromPrivateKey(auctionerPrivKey);
const auctionerPKH = new bsv.crypto.Hash.sha256ripemd160(auctionerPubKey.toBuffer());//PKH for auctioner
const bidderPrivKey = privateKey;
const bidderPubKey = bsv.PublicKey.fromPrivateKey(bidderPrivKey);
const bidderPKH = new bsv.crypto.Hash.sha256ripemd160(bidderPubKey.toBuffer());//PKH for bidder


// initial contract funding - arbitrary amount
let amount = 1000;

const BID_INCREASE = 2000;
const SLEEP_TIME = 5 // 5s;


async function runBid(prevTx, auction, amountInContract, refundPubKey) {

  return new Promise(async (resolve, reject) => {

    try {

      const unlockingTx = new bsv.Transaction()

      unlockingTx.addInput(createInputFromPrevTx(prevTx))
      .from(await fetchUtxos(bidderPrivKey.toAddress()))
      .setOutput(0, (tx) => {
        const newLockingScript = auction.getNewStateScript({
          bidder: new Ripemd160(toHex(bidderPKH))
        })
        return new bsv.Transaction.Output({
          script: newLockingScript,
          satoshis: amountInContract + BID_INCREASE,
        })
      })      
      .setOutput(1, (tx) => {
        return new bsv.Transaction.Output({
          script: bsv.Script.buildPublicKeyHashOut(refundPubKey.toAddress()),
          satoshis: amountInContract,
        })
      })
      .change(bidderPubKey.toAddress())
      .setInputScript(0, (tx, output) => {
        const preimage = getPreimage(tx, output.script, output.satoshis, 0, sighashType);
        return auction.bid(
          new Ripemd160(toHex(bidderPKH)), // bidderPKH
          (amountInContract + BID_INCREASE),
          tx.getChangeAmount(),
          new SigHashPreimage(toHex(preimage)) // sighashPreimage
        ).toScript();
      })
      .sign(bidderPrivKey)
      .seal()

      await sleep(SLEEP_TIME)
      const txid = await sendTx(unlockingTx);
      console.log('bid txid: ', txid);

      // change state after succeeded
      auction.bidder = new Ripemd160(toHex(bidderPKH))
      resolve(unlockingTx);
    } catch (error) {
      console.log('Failed on testnet');
      showError(error);
      console.log(error.context);
      reject(error)
    }

  })

}



async function runClose(prevTx, auction) {

  return new Promise(async (resolve, reject) => {

    try {

      const unlockingTx = new bsv.Transaction()
      const today = Math.round( new Date().valueOf() / 1000 );
      unlockingTx.addInput(createInputFromPrevTx(prevTx))
      .from(await fetchUtxos(auctionerPrivKey.toAddress()))
      .change(auctionerPrivKey.toAddress())
      .setInputScript(0, (tx, output) => {
        const preimage = getPreimage(tx, output.script, output.satoshis);

        const sig = signTx(tx, auctionerPrivKey, output.script, output.satoshis)
        return auction.close(sig, preimage).toScript();
      })
      .setLockTime(today)
      .sign(auctionerPrivKey)
      .seal()


      const txid = await sendTx(unlockingTx);
      console.log('close txid: ', txid);

      resolve(unlockingTx);
    } catch (error) {
      console.log('Failed on testnet');
      showError(error);
      console.log(error.context);
      reject(error)
    }

  })

}

(async () => {

  // get locking script
  const Auction = buildContractClass(compileContract('auction.scrypt'))

  const onedayAgo = new Date("2020-01-03");
  const auctionDeadline = Math.round( onedayAgo.valueOf() / 1000 );

  const auction = new Auction(new Ripemd160(toHex(auctionerPKH)), new PubKey(auctionerPubKey), auctionDeadline)


  try {

    //lock funds to the script
    const lockingTx = await deployContract(auction, amount);
    console.log('funding txid:      ', lockingTx.id);

    let prevTx = lockingTx;

    for (let i = 0; i < 3; i++) {
      await sleep(SLEEP_TIME)
      prevTx = await runBid(prevTx, auction, amount + (BID_INCREASE * i), i == 0 ? auctionerPubKey : bidderPubKey);
    }

    await sleep(SLEEP_TIME)
    
    await runClose(prevTx, auction);

    console.log('Succeeded on testnet');

  } catch (error) {
    console.log('Failed on testnet');
    showError(error);
    console.log(error.context);
  }

})()