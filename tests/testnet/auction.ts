import { Auction } from '../../src/contracts/auction'
import { getDefaultSigner } from '../utils/helper'
import { findSig, MethodCallOptions, PubKey, toHex } from 'scrypt-ts'
import { myAddress, myPrivateKey, myPublicKey } from '../utils/privateKey'

async function main() {
    await Auction.compile()

    const privateKeyAuctioneer = myPrivateKey
    const publicKeyAuctioneer = myPublicKey

    const publicKeyNewBidder = myPublicKey
    const addressNewBidder = myAddress

    const auctionDeadline = Math.round(new Date('2020-01-03').valueOf() / 1000)

    const auction = new Auction(
        PubKey(toHex(publicKeyAuctioneer)),
        BigInt(auctionDeadline)
    )
    auction.bindTxBuilder('bid', Auction.bidTxBuilder)
    await auction.connect(getDefaultSigner(privateKeyAuctioneer))

    // contract deployment
    const minBid = 1
    const deployTx = await auction.deploy(minBid)
    console.log('Auction contract deployed: ', deployTx.id)

    // contract call `bid`
    const { tx: bidTx, next } = await auction.methods.bid(
        PubKey(toHex(publicKeyNewBidder)),
        BigInt(minBid + 1),
        {
            changeAddress: addressNewBidder,
        } as MethodCallOptions<Auction>
    )
    console.log('Bid Tx: ', bidTx.id)

    // contract call `close`
    // call `close`
    const { tx: closeTx } = await next.instance.methods.close(
        (sigReps) => findSig(sigReps, publicKeyAuctioneer),
        {
            pubKeyOrAddrToSign: publicKeyAuctioneer,
            changeAddress: addressNewBidder,
            lockTime: Math.round(Date.now() / 1000),
        } as MethodCallOptions<Auction>
    )
    console.log('Close Tx: ', closeTx.id)
}

describe('Test SmartContract `Auction` on testnet', () => {
    it('should succeed', async () => {
        await main()
    })
})
