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
let previousAmount = 10000;

const FEE = 2000;
const BID_INCREASE = 2000;
const SLEEP_TIME = 3000;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}


async function runBid(prevTxid, auction, amountInContract, refundPubKey) {

  return new Promise(async (resolve, reject) => {

    try {
      console.log('prevTxid', prevTxid)

      const prevLockingScript = auction.lockingScript
  
      const newState = toHex(bidderPKH);
  
      const newLockingScriptASM = [auction.codePart.toASM(), newState].join(' ')
  
  
      const unlockingTx = new bsv.Transaction()
  
      //contract input
      unlockingTx.addInput(new bsv.Transaction.Input({
        prevTxId: prevTxid,
        outputIndex: 0,
        script: new bsv.Script(), // placeholder
      }), bsv.Script.fromASM(prevLockingScript.toASM()), amountInContract)
  
  
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
  
      unlockingTx.addOutput(new bsv.Transaction.Output({
        script: bsv.Script.fromASM(newLockingScriptASM),
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
  
  
      const preimage = getPreimage(unlockingTx, prevLockingScript.toASM(), amountInContract, 0, sighashType);
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
  
        let sig = new bsv.Transaction.Signature({
          publicKey: bidderPrivKey.publicKey,
          prevTxId: unlockingTx.inputs[index].prevTxId,
          outputIndex: unlockingTx.inputs[index].outputIndex,
          inputIndex: index,
          signature: bsv.Transaction.Sighash.sign(unlockingTx, bidderPrivKey, sighashType,
            index,
            unlockingTx.inputs[index].output.script,
            unlockingTx.inputs[index].output.satoshisBN),
          sigtype: sighashType,
        });
  
        unlockingTx.inputs[index].setScript(bsv.Script.buildPublicKeyHashIn(
          sig.publicKey,
          sig.signature.toDER(),
          sig.sigtype,
        ));
  
      }
  
      // you can verify before sendTx
      const result = auction.bid(
        new Ripemd160(toHex(bidderPKH)), // bidderPKH
        (amountInContract + BID_INCREASE),
        changeAmount,
        new SigHashPreimage(toHex(preimage)) // sighashPreimage
      ).verify({ tx: unlockingTx, inputSatoshis: amountInContract, inputIndex: 0 })

      if(!result.success) {
        console.error(result)
      }
  
      await sleep(SLEEP_TIME)
      const txid = await sendTx(unlockingTx);
      console.log('txid: ', txid);
  
  
      // change state after succeeded
      auction.setDataPart(newState)
  
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
  const Auction = buildContractClass(loadDesc('auction_desc.json'))
  const auction = new Auction(new PubKey(auctionerPubKey), Math.round(new Date().getTime() / 1000) + 3600)

  // append state as passive data
  auction.setDataPart(toHex(auctionerPKH))

  
  try {
    
      //lock funds to the script
    const lockingTx = await createLockingTx(auctionerPrivKey.toAddress(), previousAmount, FEE)
    lockingTx.outputs[0].setScript(auction.lockingScript)
    lockingTx.sign(auctionerPrivKey)
    let lockingTxid = await sendTx(lockingTx)
    console.log('funding txid:      ', lockingTxid)

    let prevTxid = lockingTxid;

    for (let i = 0; i < 5; i++) {
  
      const txid = await runBid(prevTxid, auction, previousAmount + (BID_INCREASE*i), i == 0 ? auctionerPubKey :  bidderPubKey);
      await sleep(SLEEP_TIME)
      prevTxid = txid;
  
    }


  } catch (error) {
      console.log('Failed on testnet');
      showError(error);
      console.log(error.context);
  }




})()