import { Auction } from '../../src/contracts/auction'
import { getUtxoManager } from './util/utxoManager'
import { signAndSend } from './util/txHelper'
import { bsv, PubKeyHash, Ripemd160, toHex, PubKey } from 'scrypt-ts'
import { myPrivateKey } from './util/myPrivateKey'

async function main() {
    const utxoMgr = await getUtxoManager()
    await Auction.compile()

    const privateKeyHighestBid = bsv.PrivateKey.fromRandom('testnet')
    const publicKeyHighestBid =
        bsv.PublicKey.fromPrivateKey(privateKeyHighestBid)
    const publicKeyHashHighestBid = bsv.crypto.Hash.sha256ripemd160(
        publicKeyHighestBid.toBuffer()
    )

    const privateKeyAuctioneer = bsv.PrivateKey.fromRandom('testnet')
    const publicKeyAuctioneer =
        bsv.PublicKey.fromPrivateKey(privateKeyAuctioneer)

    const publicKeyNewBid = bsv.PublicKey.fromPrivateKey(myPrivateKey)
    const publicKeyHashNewBid = bsv.crypto.Hash.sha256ripemd160(
        publicKeyNewBid.toBuffer()
    )

    const oneDayAgo = new Date('2020-01-03')
    const auctionDeadline = BigInt(Math.round(oneDayAgo.valueOf() / 1000))

    const auction = new Auction(
        PubKeyHash(toHex(publicKeyHashHighestBid)),
        PubKey(toHex(publicKeyAuctioneer)),
        auctionDeadline
    ).markAsGenesis()

    const highestBid = 1000
    const newBid = highestBid * 2
    // contract deployment
    // 1. get the available utxos for the private key
    const utxos = await utxoMgr.getUtxos()
    // 2. construct a transaction for deployment
    const unsignedDeployTx = auction.getDeployTx(utxos, 1000)
    // 3. sign and broadcast the transaction
    const deployTx = await signAndSend(unsignedDeployTx)
    console.log('Auction contract deployed: ', deployTx.id)

    // collect the new p2pkh utxo
    utxoMgr.collectUtxoFrom(deployTx)

    // contract call
    // 1. build a new contract instance
    const newInstance = auction.next()
    newInstance.bidder = PubKeyHash(toHex(publicKeyHashNewBid))
    // 1. construct a transaction for call
    const unsignedBidTx = auction.getCallTxForBid(
        await utxoMgr.getUtxos(),
        deployTx,
        newInstance,
        Ripemd160(toHex(publicKeyHashNewBid)),
        newBid
    )

    // 2. sign and broadcast the transaction
    const bidTx = await signAndSend(unsignedBidTx, myPrivateKey, false)

    console.log('Bid Tx: ', bidTx.id)

    // collect the new p2pkh utxo if it exists in `callTx`
    utxoMgr.collectUtxoFrom(bidTx)
    const instance = newInstance
    const unsignedCloseTx = instance.getCallTxForClose(
        Number(auctionDeadline) + 1000,
        privateKeyAuctioneer,
        bidTx
    )
    const closeTx = await signAndSend(unsignedCloseTx, privateKeyAuctioneer)

    console.log('Close Tx: ', closeTx.id)
}

describe('Test SmartContract `Auction` on testnet', () => {
    it('should success', async () => {
        await main()
    })
})
