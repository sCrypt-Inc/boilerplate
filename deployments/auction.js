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
  DataLen,
  loadDesc,
  createLockingTx,
  sendTx,
  showError,
  unlockP2PKHInput,
  createUnlockingTx,
  anyOnePayforTx,
  emptyPublicKey
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
let previousAmount = 1000;

const FEE = 5000;
const BID_INCREASE = 2000;
const SLEEP_TIME = 5000;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}


async function runBid(prevTxid, auction, amountInContract, refundPubKey) {

  return new Promise(async (resolve, reject) => {

    try {
      console.log('prevTxid', prevTxid)


      const unlockingTx = new bsv.Transaction()

      //contract input
      unlockingTx.addInput(new bsv.Transaction.Input({
        prevTxId: prevTxid,
        outputIndex: 0,
        script: new bsv.Script(), // placeholder
      }), auction.lockingScript, amountInContract)


      // input(s) from bidder
      let {
        data: utxos
      } = await axios.get(`https://api.whatsonchain.com/v1/bsv/test/address/` + bidderPrivKey.toAddress() + `/unspent`)

      utxos.map(utxo => {
        unlockingTx.addInput(new bsv.Transaction.Input({
          prevTxId: utxo.tx_hash,
          outputIndex: utxo.tx_pos,
          script: new bsv.Script(), // placeholder
        }), bsv.Script.buildPublicKeyHashOut(bidderPrivKey.toAddress()).toHex(), utxo.value)
        console.log('input 1: ' + utxo.value);
      })

      let newLockingScript = auction.getNewStateScript({
        bidder: new Ripemd160(toHex(bidderPKH))
      })

      unlockingTx.addOutput(new bsv.Transaction.Output({
        script: newLockingScript,
        satoshis: amountInContract + BID_INCREASE,
      }))

      unlockingTx.addOutput(new bsv.Transaction.Output({
        script: bsv.Script.buildPublicKeyHashOut(refundPubKey.toAddress()),
        satoshis: amountInContract,
      }))


      const changeAmount = unlockingTx.inputAmount - (amountInContract + BID_INCREASE)/*now*/ - amountInContract/*prev*/ - FEE;
      unlockingTx.addOutput(new bsv.Transaction.Output({
        script: bsv.Script.buildPublicKeyHashOut(bidderPubKey.toAddress()),
        satoshis: changeAmount,
      }))

      unlockingTx.fee(FEE);


      const preimage = getPreimage(unlockingTx, auction.lockingScript, amountInContract, 0, sighashType);
      //console.log('preimage: '+preimage);

      const unlockingScript = auction.bid(
        new Ripemd160(toHex(bidderPKH)), // bidderPKH
        (amountInContract + BID_INCREASE),
        changeAmount,
        new SigHashPreimage(toHex(preimage)) // sighashPreimage
      ).toScript();


      // unlock contract input
      unlockingTx.inputs[0].setScript(unlockingScript);

      // unlock other p2pkh inputs
      for (let index = 1; index < unlockingTx.inputs.length; index++) {
        unlockP2PKHInput(bidderPrivKey, unlockingTx, index, sighashType)
      }

      // you can verify before sendTx
      const result = auction.bid(
        new Ripemd160(toHex(bidderPKH)), // bidderPKH
        (amountInContract + BID_INCREASE),
        changeAmount,
        new SigHashPreimage(toHex(preimage)) // sighashPreimage
      ).verify({ tx: unlockingTx, inputSatoshis: amountInContract, inputIndex: 0 })

      if (!result.success) {
        console.error(result)
      }

      await sleep(SLEEP_TIME)
      const txid = await sendTx(unlockingTx);
      console.log('txid: ', txid);


      // change state after succeeded
      auction.bidder = new Ripemd160(toHex(bidderPKH))

      console.log('Succeeded on testnet');

      resolve(txid);
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
  const Auction = buildContractClass(loadDesc('auction_debug_desc.json'))
  const auction = new Auction(new Ripemd160(toHex(auctionerPKH)), new PubKey(auctionerPubKey), Math.round(new Date().getTime() / 1000) + 3600)


  try {

    //lock funds to the script
    const lockingTx = await createLockingTx(auctionerPrivKey.toAddress(), previousAmount, auction.lockingScript)
    lockingTx.sign(auctionerPrivKey)
    let lockingTxid = await sendTx(lockingTx)
    console.log('funding txid:      ', lockingTxid)

    let prevTxid = lockingTxid;

    for (let i = 0; i < 5; i++) {
      await sleep(SLEEP_TIME)
      const txid = await runBid(prevTxid, auction, previousAmount + (BID_INCREASE * i), i == 0 ? auctionerPubKey : bidderPubKey);

      prevTxid = txid;

    }


  } catch (error) {
    console.log('Failed on testnet');
    showError(error);
    console.log(error.context);
  }


})()