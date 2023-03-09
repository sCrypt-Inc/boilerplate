import { Auction } from '../../src/contracts/auction'
import { getDefaultSigner, inputSatoshis } from '../utils/helper'
import {
    findSig,
    MethodCallOptions,
    PubKey,
    PubKeyHash,
    toHex,
} from 'scrypt-ts'
import {
    myAddress,
    myPrivateKey,
    myPublicKey,
    myPublicKeyHash,
} from '../utils/privateKey'

async function main() {
    await Auction.compile()
    Auction.bindTxBuilder('bid', Auction.bidTxBuilder)

    const privateKeyAuctioneer = myPrivateKey
    const publicKeyAuctioneer = myPublicKey

    const publicKeyHashNewBidder = myPublicKeyHash
    const addressNewBidder = myAddress

    const auctionDeadline = Math.round(new Date('2020-01-03').valueOf() / 1000)

    const auction = new Auction(
        PubKey(toHex(publicKeyAuctioneer)),
        BigInt(auctionDeadline)
    )

    await auction.connect(getDefaultSigner(privateKeyAuctioneer))

    // contract deployment
    const deployTx = await auction.deploy(inputSatoshis)
    console.log('Auction contract deployed: ', deployTx.id)

    // contract call `bid`
    const { tx: bidTx, next } = await auction.methods.bid(
        PubKeyHash(toHex(publicKeyHashNewBidder)),
        BigInt(inputSatoshis + 1),
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
