import { Auction } from '../../src/contracts/auction'
import {
    findSig,
    MethodCallOptions,
    PubKey,
    PubKeyHash,
    toHex,
} from 'scrypt-ts'
import {
    dummySigner,
    dummyUTXO,
    getDummyContractUTXO,
    randomPrivateKey,
} from './util/txHelper'
import { expect } from 'chai'

describe('Test SmartContract `Auction` on testnet', () => {
    const [, , publicKeyHashHighestBidder] = randomPrivateKey()
    const [privateKeyAuctioneer, publicKeyAuctioneer, ,] = randomPrivateKey()
    const [, , publicKeyHashNewBid, addressNewBid] = randomPrivateKey()

    const auctionDeadline = Math.round(new Date('2020-01-03').valueOf() / 1000)

    let auction: Auction

    before(async () => {
        await Auction.compile()
        Auction.bindTxBuilder('bid', Auction.bidTxBuilder)

        auction = new Auction(
            PubKeyHash(toHex(publicKeyHashHighestBidder)),
            PubKey(toHex(publicKeyAuctioneer)),
            BigInt(auctionDeadline)
        )
        await auction.connect(dummySigner(privateKeyAuctioneer))
    })

    it('should pass `bid` call', async () => {
        const balance = 1
        const { tx: callTx, atInputIndex } = await auction.methods.bid(
            PubKeyHash(toHex(publicKeyHashNewBid)),
            BigInt(balance + 1),
            {
                fromUTXO: getDummyContractUTXO(balance),
                changeAddress: addressNewBid,
            } as MethodCallOptions<Auction>
        )

        const result = callTx.verifyInputScript(atInputIndex)
        expect(result.success, result.error).to.eq(true)
    })

    it('should pass `close` call', async () => {
        const { tx: callTx, atInputIndex } = await auction.methods.close(
            (sigResps) => findSig(sigResps, publicKeyAuctioneer),
            {
                fromUTXO: dummyUTXO,
                pubKeyOrAddrToSign: publicKeyAuctioneer,
                changeAddress: addressNewBid,
                lockTime: auctionDeadline + 1,
            } as MethodCallOptions<Auction>
        )

        const result = callTx.verifyInputScript(atInputIndex)
        expect(result.success, result.error).to.eq(true)
    })
})
