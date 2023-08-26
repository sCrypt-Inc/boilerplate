import { Auction } from '../src/contracts/auction'
import { findSig, MethodCallOptions, PubKey, toHex } from 'scrypt-ts'
import { expect } from 'chai'
import { getDefaultSigner, randomPrivateKey } from './utils/helper'

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

        await auction.connect(getDefaultSigner(privateKeyAuctioneer))
    })

    it('should pass `bid` call', async () => {
        const balance = 1
        await auction.deploy(1)
        const callContract = async () =>
            await auction.methods.bid(
                PubKey(toHex(publicKeyNewBidder)),
                BigInt(balance + 1),
                {
                    changeAddress: addressNewBidder,
                } as MethodCallOptions<Auction>
            )
        expect(callContract()).not.throw
    })

    it('should pass `close` call', async () => {
        await auction.deploy(1)
        const callContract = async () =>
            await auction.methods.close(
                (sigResps) => findSig(sigResps, publicKeyAuctioneer),
                {
                    pubKeyOrAddrToSign: publicKeyAuctioneer,
                    changeAddress: addressNewBidder,
                    lockTime: auctionDeadline + 1,
                } as MethodCallOptions<Auction>
            )
        expect(callContract()).not.throw
    })
})
