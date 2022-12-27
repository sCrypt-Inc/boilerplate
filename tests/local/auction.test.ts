import { expect } from 'chai';
import { SigHashPreimage, bsv, PubKeyHash, PubKey, toHex } from 'scrypt-ts';
import { Auction } from '../../src/contracts/auction';
import { inputSatoshis} from '../txHelper';

describe('Transpiler', () => {
  before(async () => {
    await Auction.compile(); // asm 
  })

  it('should transpile contract `Auction` successfully.', async () => {

    const privateKeyHighestBid = bsv.PrivateKey.fromRandom('testnet');
    const publicKeyHighestBid = bsv.PublicKey.fromPrivateKey(privateKeyHighestBid);
    const publicKeyHashHighestBid = bsv.crypto.Hash.sha256ripemd160(publicKeyHighestBid.toBuffer());
    const addressHighestBid = privateKeyHighestBid.toAddress();


    const privateKeyAuctioner = bsv.PrivateKey.fromRandom('testnet');
    const publicKeyAuctioner = bsv.PublicKey.fromPrivateKey(privateKeyAuctioner);

    const privateKeyNewBid = bsv.PrivateKey.fromRandom('testnet');
    const publicKeyNewBid = bsv.PublicKey.fromPrivateKey(privateKeyNewBid);
    const publicKeyHashNewBid = bsv.crypto.Hash.sha256ripemd160(publicKeyNewBid.toBuffer());
    const addressNewBid = privateKeyNewBid.toAddress();

    const bid = inputSatoshis + 10000;

    const FEE = 5000;

    const payinputSatoshis = 200000;

    const changeSats = payinputSatoshis - bid - FEE;


    const onedayAgo = new Date("2020-01-03");
    const auctionDeadline = BigInt(Math.round(onedayAgo.valueOf() / 1000));

    const auction = new Auction(PubKeyHash(toHex(publicKeyHashHighestBid)), PubKey(toHex(publicKeyAuctioner)), auctionDeadline).markAsGenesis();


    let initBalance = 10000;

    let newInstance = auction.next();

    const outputIndex = 0;
    const inputIndex = 0;
    newInstance.bidder = PubKeyHash(toHex(publicKeyHashNewBid));

    let callTx: bsv.Transaction = new bsv.Transaction()
      .addDummyInput(auction.lockingScript, initBalance)
      .setOutput(outputIndex, (tx: bsv.Transaction) => {
        // bind contract & tx locking relation
        return new bsv.Transaction.Output({
          // use newInstance's lockingscript as the new UTXO's lockingscript
          script: newInstance.lockingScript,
          satoshis: bid,
        })
      })
      .addOutput(new bsv.Transaction.Output({
        script: bsv.Script.buildPublicKeyHashOut(addressHighestBid),
        satoshis: inputSatoshis
      }))
      .addOutput(new bsv.Transaction.Output({
        script: bsv.Script.buildPublicKeyHashOut(addressNewBid),
        satoshis: changeSats
      }))
      .setInputScript(inputIndex, (tx: bsv.Transaction) => {
        // bind contract & tx unlocking relation
        // use the cloned version bcoz this callback will be executed multiple times during tx building process,
        // and calling contract method may have side effects on its properties.  
        return auction.getUnlockingScript((cloned) => {
          // call previous counter's public method to get the unlocking script.
          cloned.unlockFrom = {tx, inputIndex}
          cloned.bid(PubKeyHash(toHex(publicKeyHashNewBid)), BigInt(bid), BigInt(changeSats), SigHashPreimage(tx.getPreimage(0)))
        })
      })
      .seal();


    let result = callTx.verifyInputScript(0)

    expect(result.success, result.error).to.eq(true);

  })

})