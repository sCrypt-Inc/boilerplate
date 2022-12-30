import { Auction } from '../../src/contracts/auction';
import { getUtxoManager } from './util/utxoManager';
import { signAndSend } from './util/txHelper';
import { bsv, PubKeyHash, Ripemd160, toHex, PubKey } from 'scrypt-ts';
import { privateKey } from './util/privateKey';
async function main() {
    const utxoMgr = await getUtxoManager();
    await Auction.compile();

    const privateKeyHighestBid = bsv.PrivateKey.fromRandom('testnet');
    const publicKeyHighestBid = bsv.PublicKey.fromPrivateKey(privateKeyHighestBid);
    const publicKeyHashHighestBid = bsv.crypto.Hash.sha256ripemd160(publicKeyHighestBid.toBuffer());
    const addressHighestBid = privateKeyHighestBid.toAddress();


    const privateKeyAuctioner = bsv.PrivateKey.fromRandom('testnet');
    const publicKeyAuctioner = bsv.PublicKey.fromPrivateKey(privateKeyAuctioner);

    const privateKeyNewBid = privateKey;
    const publicKeyNewBid = bsv.PublicKey.fromPrivateKey(privateKeyNewBid);
    const publicKeyHashNewBid = bsv.crypto.Hash.sha256ripemd160(publicKeyNewBid.toBuffer());
    const addressNewBid = privateKeyNewBid.toAddress();


    const onedayAgo = new Date("2020-01-03");
    const auctionDeadline = BigInt(Math.round(onedayAgo.valueOf() / 1000));

    const auction = new Auction(PubKeyHash(toHex(publicKeyHashHighestBid)), PubKey(toHex(publicKeyAuctioner)), auctionDeadline)
        .markAsGenesis();


  
    const highestBid = 1000;
    const newBid = highestBid * 2;
    // contract deployment
    // 1. get the available utxos for the private key
    const utxos = await utxoMgr.getUtxos();
    // 2. construct a transaction for deployment
    const unsignedDeployTx = auction.getDeployTx(utxos, 1000);
    // 3. sign and broadcast the transaction
    const deployTx = await signAndSend(unsignedDeployTx);
    console.log('Auction contract deployed: ', deployTx.id);

    // collect the new p2pkh utxo
    utxoMgr.collectUtxoFrom(deployTx);

    // contract call
    // 1. build a new contract instance
    const newInstance = auction.next();
    newInstance.bidder = PubKeyHash(toHex(publicKeyHashNewBid))
    // 1. construct a transaction for call
    const unsignedCallTx = auction.getCallTxForBid(await utxoMgr.getUtxos(), deployTx, newInstance, 
        Ripemd160(toHex(publicKeyHashNewBid)), newBid);

    // 2. sign and broadcast the transaction
    const callTx = await signAndSend(unsignedCallTx, privateKey, false);

    
    console.log('Auction contract called: ', callTx.id);

    // collect the new p2pkh utxo if it exists in `callTx`
    utxoMgr.collectUtxoFrom(callTx);
}

describe('Test SmartContract `Auction` on testnet', () => {
    it('should success', async () => {
        await main();
    })
})