import { Auction } from '../../src/contracts/auction'
import { findSig, MethodCallOptions, PubKey, toHex } from 'scrypt-ts'
import { expect } from 'chai'
import { getDummySigner, getDummyUTXO, randomPrivateKey } from '../utils/helper'

describe('Test SmartContract `Auction` on testnet', () => {
    const [privateKeyAuctioneer, publicKeyAuctioneer, ,] = randomPrivateKey()
    const [, publicKeyNewBidder, , addressNewBidder] = randomPrivateKey()

    const auctionDeadline = Math.round(new Date('2020-01-03').valueOf() / 1000)

    let auction: Auction

    before(async () => {
        await Auction.compile()

        auction = new Auction(
            PubKey(toHex(publicKeyAuctioneer)),
            BigInt(auctionDeadline)
        )

        auction.bindTxBuilder('bid', Auction.bidTxBuilder)

        await auction.connect(getDummySigner(privateKeyAuctioneer))
    })

    it('should pass `bid` call', async () => {
        const balance = 1
        const { tx: callTx, atInputIndex } = await auction.methods.bid(
            PubKey(toHex(publicKeyNewBidder)),
            BigInt(balance + 1),
            {
                fromUTXO: getDummyUTXO(balance),
                changeAddress: addressNewBidder,
            } as MethodCallOptions<Auction>
        )

        const result = callTx.verifyScript(atInputIndex)
        expect(result.success, result.error).to.eq(true)
    })

    it('should pass `close` call', async () => {
        const { tx: callTx, atInputIndex } = await auction.methods.close(
            (sigResps) => findSig(sigResps, publicKeyAuctioneer),
            {
                fromUTXO: getDummyUTXO(),
                pubKeyOrAddrToSign: publicKeyAuctioneer,
                changeAddress: addressNewBidder,
                lockTime: auctionDeadline + 1,
            } as MethodCallOptions<Auction>
        )

        const result = callTx.verifyScript(atInputIndex)
        expect(result.success, result.error).to.eq(true)
    })
})
