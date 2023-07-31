import { OrdinalAuction } from '../../src/contracts/ordinalAuction'
import {
    bsv,
    ByteString,
    findSig,
    hash160,
    int2ByteString,
    MethodCallOptions,
    or,
    PubKey,
    Sig,
    toByteString,
    toHex,
    Utils,
    UTXO,
} from 'scrypt-ts'
import { expect } from 'chai'
import { getDummySigner, getDummyUTXO, randomPrivateKey } from '../utils/helper'
import { randomBytes } from 'crypto'

describe('Test SmartContract `OrdinalAuction` on testnet', () => {
    const [privateKeyAuctioneer, publicKeyAuctioneer, ,] = randomPrivateKey()
    const [, publicKeyNewBidder, , addressNewBidder] = randomPrivateKey()

    const auctionDeadline = Math.round(new Date('2020-01-03').valueOf() / 1000)

    const ordinalUTXO: UTXO = {
        txId: randomBytes(32).toString('hex'),
        outputIndex: 0,
        script: Utils.buildPublicKeyHashScript(
            hash160(publicKeyAuctioneer.toHex())
        ),
        satoshis: 1,
    }

    let auction: OrdinalAuction

    before(async () => {
        await OrdinalAuction.compile()

        // TODO: Check endiannes
        const ordinalPrevout: ByteString =
            toByteString(ordinalUTXO.txId) + int2ByteString(0n, 4n)

        auction = new OrdinalAuction(
            ordinalPrevout,
            PubKey(toHex(publicKeyAuctioneer)),
            BigInt(auctionDeadline)
        )

        auction.bindTxBuilder('bid', OrdinalAuction.bidTxBuilder)

        await auction.connect(getDummySigner(privateKeyAuctioneer))
    })

    it('should pass whole auction', async () => {
        let balance = 1
        let currentInstance = auction

        // Perform bidding.
        let contractTx = undefined
        for (let i = 0; i < 3; i++) {
            const highestBidder = PubKey(toHex(publicKeyNewBidder))
            const bid = BigInt(balance + 100)

            const nextInstance = currentInstance.next()
            nextInstance.bidder = highestBidder

            contractTx = await auction.methods.bid(highestBidder, bid, {
                fromUTXO: getDummyUTXO(balance),
                changeAddress: addressNewBidder,
                next: {
                    instance: nextInstance,
                    balance: Number(bid),
                },
            } as MethodCallOptions<OrdinalAuction>)

            const result = contractTx.tx.verifyScript(contractTx.atInputIndex)
            expect(result.success, result.error).to.eq(true)

            balance += Number(bid)
            currentInstance = nextInstance
        }

        // Close the auction.
        auction.bindTxBuilder(
            'close',
            (
                current: OrdinalAuction,
                options: MethodCallOptions<OrdinalAuction>,
                sigAuctioneer: Sig,
                prevouts: ByteString
            ) => {
                const unsignedTx: bsv.Transaction = new bsv.Transaction()
                    // add input that unlocks ordinal UTXO
                    .from(ordinalUTXO)
                    // add contract input
                    .addInput(current.buildContractInput(options.fromUTXO))
                    // build ordinal destination output
                    .addOutput(
                        new bsv.Transaction.Output({
                            script: bsv.Script.fromHex(
                                Utils.buildPublicKeyHashScript(
                                    hash160(current.bidder)
                                )
                            ),
                            satoshis: 1,
                        })
                    )
                    // build auctioneer payment output
                    .addOutput(
                        new bsv.Transaction.Output({
                            script: bsv.Script.fromHex(
                                Utils.buildPublicKeyHashScript(
                                    hash160(current.bidder)
                                )
                            ),
                            satoshis: current.utxo.satoshis,
                        })
                    )

                if (options.changeAddress) {
                    unsignedTx.change(options.changeAddress)
                }

                return Promise.resolve({
                    tx: unsignedTx,
                    atInputIndex: 0,
                    nexts: [],
                })
            }
        )

        const prevouts = toByteString('00')
        contractTx = await auction.methods.close(
            (sigResps) => findSig(sigResps, publicKeyAuctioneer),
            prevouts,
            {
                fromUTXO: getDummyUTXO(balance),
                changeAddress: addressNewBidder,
                pubKeyOrAddrToSign: publicKeyAuctioneer,
                multiContractCall: true,
                autoPayFee: false,
            } as MethodCallOptions<OrdinalAuction>
        )

        // TODO: Add fee inputs.

        // TODO: Assemble prevouts.

        // TODO: Sign ordinal UTXO input.

        console.log(contractTx.tx)

        contractTx = await auction.methods.close(
            (sigResps) => findSig(sigResps, publicKeyAuctioneer),
            prevouts,
            {
                fromUTXO: getDummyUTXO(balance),
                changeAddress: addressNewBidder,
                pubKeyOrAddrToSign: publicKeyAuctioneer,
                multiContractCall: true,
                partialContractTx: contractTx.tx,
            } as MethodCallOptions<OrdinalAuction>
        )

        console.log(contractTx.tx)

        // TODO: Sign first input
    })
})
