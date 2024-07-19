import { getDefaultSigner, randomPrivateKey } from './utils/helper'
import {
    Addr,
    bsv,
    ByteString,
    findSig,
    int2ByteString,
    MethodCallOptions,
    PubKey,
    pubKey2Addr,
    reverseByteString,
    Sig,
    toByteString,
    Utils,
    UTXO,
} from 'scrypt-ts'
import { myPrivateKey, myPublicKey } from './utils/privateKey'
import { OrdinalAuction } from '../src/contracts/ordinalAuction'
import { signTx } from 'scryptlib'
import { expect } from 'chai'
import { OrdiNFTP2PKH } from 'scrypt-ord'

describe('Test SmartContract `OrdinalAuction`', () => {
    const privateKeyAuctioneer = myPrivateKey
    const publicKeyAuctioneer = myPublicKey
    const addressAuctioneer = publicKeyAuctioneer.toAddress()

    const bidderPrivateKeys: bsv.PrivateKey[] = []
    const bidderPublicKeys: bsv.PublicKey[] = []
    const bidderAddresses: bsv.Address[] = []

    let auction: OrdinalAuction

    let ordinalUTXO: UTXO
    const auctionDeadline = Math.round(new Date('2020-01-03').valueOf() / 1000)

    before(async () => {
        OrdinalAuction.loadArtifact()
        for (let i = 0; i < 3; i++) {
            const [privateKeyBidder, publicKeyBidder, addressBidder] =
                randomPrivateKey()
            bidderPrivateKeys.push(privateKeyBidder)
            bidderPublicKeys.push(publicKeyBidder)
            bidderAddresses.push(addressBidder)
        }

        const ordinal = new OrdiNFTP2PKH(Addr(addressAuctioneer.toByteString()))
        await ordinal.connect(getDefaultSigner())
        const ordinalTx = await ordinal.inscribeText('Hello, sCrypt!')

        ordinalUTXO = {
            txId: ordinalTx.id,
            outputIndex: 0,
            script: ordinalTx.outputs[0].script.toHex(),
            satoshis: ordinalTx.outputs[0].satoshis,
        }
        console.log('Ordinal deployed:', ordinalUTXO.txId)

        const ordinalPrevout: ByteString =
            reverseByteString(toByteString(ordinalUTXO.txId), 32n) +
            int2ByteString(BigInt(ordinalUTXO.outputIndex), 4n)

        auction = new OrdinalAuction(
            ordinalPrevout,
            PubKey(publicKeyAuctioneer.toByteString()),
            BigInt(auctionDeadline)
        )

        await auction.connect(getDefaultSigner(privateKeyAuctioneer))
    })

    it('should succeed', async () => {
        // contract deployment
        const minBid = 1
        await auction.deploy(minBid)

        let balance = minBid
        let currentInstance = auction

        // Perform bidding.
        for (let i = 0; i < 3; i++) {
            const newHighestBidder = PubKey(bidderPublicKeys[i].toByteString())
            const bid = BigInt(balance + 1)

            const nextInstance = currentInstance.next()
            nextInstance.bidder = newHighestBidder

            expect(
                await currentInstance.methods.bid(newHighestBidder, bid, {
                    changeAddress: bidderAddresses[i],
                    next: {
                        instance: nextInstance,
                        balance: Number(bid),
                    },
                } as MethodCallOptions<OrdinalAuction>)
            ).not.throw

            balance += Number(bid)
            currentInstance = nextInstance
        }

        // Close the auction
        currentInstance.bindTxBuilder(
            'close',
            async (
                current: OrdinalAuction,
                options: MethodCallOptions<OrdinalAuction>,
                sigAuctioneer: Sig,
                prevouts: ByteString
            ) => {
                const unsignedTx: bsv.Transaction = new bsv.Transaction()

                // add input that unlocks ordinal UTXO
                unsignedTx
                    .addInput(
                        new bsv.Transaction.Input({
                            prevTxId: ordinalUTXO.txId,
                            outputIndex: ordinalUTXO.outputIndex,
                            script: new bsv.Script(''),
                        }),
                        bsv.Script.fromHex(ordinalUTXO.script),
                        ordinalUTXO.satoshis
                    )
                    .addInput(current.buildContractInput())

                // build ordinal destination output
                unsignedTx
                    .addOutput(
                        new bsv.Transaction.Output({
                            script: bsv.Script.fromHex(
                                Utils.buildPublicKeyHashScript(
                                    pubKey2Addr(current.bidder)
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
                                    pubKey2Addr(current.auctioneer)
                                )
                            ),
                            satoshis: current.utxo.satoshis,
                        })
                    )

                if (options.changeAddress) {
                    unsignedTx.change(options.changeAddress)
                }

                if (options.sequence !== undefined) {
                    unsignedTx.inputs[1].sequenceNumber = options.sequence
                }

                if (options.lockTime !== undefined) {
                    unsignedTx.nLockTime = options.lockTime
                }

                return Promise.resolve({
                    tx: unsignedTx,
                    atInputIndex: 1,
                    nexts: [],
                })
            }
        )

        const contractTx = await currentInstance.methods.close(
            (sigResps) => findSig(sigResps, publicKeyAuctioneer),
            {
                pubKeyOrAddrToSign: publicKeyAuctioneer,
                changeAddress: addressAuctioneer,
                lockTime: auctionDeadline + 1,
                sequence: 0,
                partiallySigned: true,
                exec: false, // Do not execute the contract yet, only get the created calling transaction.
            } as MethodCallOptions<OrdinalAuction>
        )

        // If we would like to broadcast, here we need to sign ordinal UTXO input.

        const ordinalSig = signTx(
            contractTx.tx,
            privateKeyAuctioneer,
            bsv.Script.fromHex(ordinalUTXO.script),
            ordinalUTXO.satoshis,
            0,
            bsv.crypto.Signature.ANYONECANPAY_SINGLE
        )

        // set ordinal unlocking script
        contractTx.tx.inputs[0].setScript(
            bsv.Script.fromASM(`${ordinalSig} ${publicKeyAuctioneer.toHex()}`)
        )

        // Bind tx builder, that just simply re-uses the tx we created above.
        currentInstance.bindTxBuilder(
            'close',
            async (
                current: OrdinalAuction,
                options: MethodCallOptions<OrdinalAuction>
            ) => {
                return Promise.resolve({
                    tx: contractTx.tx,
                    atInputIndex: 1,
                    nexts: [],
                })
            }
        )

        expect(
            await currentInstance.methods.close(
                (sigResps) => findSig(sigResps, publicKeyAuctioneer),
                {
                    pubKeyOrAddrToSign: publicKeyAuctioneer,
                    changeAddress: addressAuctioneer,
                    lockTime: auctionDeadline + 1,
                    sequence: 0,
                } as MethodCallOptions<OrdinalAuction>
            )
        ).not.throw
    })
})
