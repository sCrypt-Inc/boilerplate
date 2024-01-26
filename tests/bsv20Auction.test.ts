import { getDefaultSigner, randomPrivateKey, sleep } from './utils/helper'
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
    toByteString,
    Utils,
} from 'scrypt-ts'
import { myPrivateKey, myPublicKey } from './utils/privateKey'
import { BSV20Auction } from '../src/contracts/bsv20Auction'
import { signTx } from 'scryptlib'
import { BSV20V2, BSV20V2P2PKH } from 'scrypt-ord'

async function main() {
    BSV20Auction.loadArtifact()

    const privateKeyAuctioneer = myPrivateKey
    const publicKeyAuctioneer = myPublicKey
    const addressAuctioneer = publicKeyAuctioneer.toAddress()

    const bidderPrivateKeys: bsv.PrivateKey[] = []
    const bidderPublicKeys: bsv.PublicKey[] = []
    const bidderAddresses: bsv.Address[] = []
    for (let i = 0; i < 3; i++) {
        const [privateKeyBidder, publicKeyBidder, addressBidder] =
            randomPrivateKey()
        bidderPrivateKeys.push(privateKeyBidder)
        bidderPublicKeys.push(publicKeyBidder)
        bidderAddresses.push(addressBidder)
    }

    const auctionDeadline = Math.round(new Date('2020-01-03').valueOf() / 1000)

    // Mint some tokens.
    const max = 10000n // Whole token amount.
    const dec = 0n // Decimal precision.
    const sym = toByteString('TEST', true)

    const bsv20p2pkh = new BSV20V2P2PKH(
        toByteString(''),
        sym,
        max,
        dec,
        Addr(publicKeyAuctioneer.toAddress().toByteString())
    )
    await bsv20p2pkh.connect(getDefaultSigner())
    const tokenId = await bsv20p2pkh.deployToken()

    const ordinalUTXO = bsv20p2pkh.utxo

    console.log('Mock BSV-20 tokens deployed:', ordinalUTXO.txId)

    await sleep(3)

    const ordinalPrevout: ByteString =
        reverseByteString(toByteString(ordinalUTXO.txId), 32n) +
        int2ByteString(BigInt(ordinalUTXO.outputIndex), 4n)

    const auction = new BSV20Auction(
        toByteString(tokenId, true),
        sym,
        max,
        dec,
        10000n,
        ordinalPrevout,
        PubKey(publicKeyAuctioneer.toByteString()),
        BigInt(auctionDeadline)
    )

    await auction.connect(getDefaultSigner(privateKeyAuctioneer))

    // contract deployment
    const minBid = 1
    const deployTx = await auction.deploy(minBid)
    console.log('Auction contract deployed: ', deployTx.id)

    let balance = minBid
    let currentInstance = auction

    // Perform bidding.
    for (let i = 0; i < 3; i++) {
        const newHighestBidder = PubKey(bidderPublicKeys[i].toByteString())
        const bid = BigInt(balance + 1)

        const nextInstance = currentInstance.next()
        nextInstance.bidder = newHighestBidder

        const callRes = await currentInstance.methods.bid(
            newHighestBidder,
            bid,
            {
                changeAddress: bidderAddresses[i],
                next: {
                    instance: nextInstance,
                    balance: Number(bid),
                },
            } as MethodCallOptions<BSV20Auction>
        )

        console.log('Bid Tx:', callRes.tx.id)

        balance += Number(bid)
        currentInstance = nextInstance
    }

    // Close the auction
    currentInstance.bindTxBuilder(
        'close',
        async (
            current: BSV20Auction,
            options: MethodCallOptions<BSV20Auction>
        ) => {
            const unsignedTx: bsv.Transaction = new bsv.Transaction()

            // Add input that unlocks ordinal UTXO.
            unsignedTx
                .addInput(
                    new bsv.Transaction.Input({
                        prevTxId: ordinalUTXO.txId,
                        outputIndex: ordinalUTXO.outputIndex,
                        script: bsv.Script.fromHex('00'.repeat(34)), // Dummy script
                    }),
                    bsv.Script.fromHex(ordinalUTXO.script),
                    ordinalUTXO.satoshis
                )
                .addInput(current.buildContractInput())

            // Build ordinal destination output.
            unsignedTx
                .addOutput(
                    new bsv.Transaction.Output({
                        script: bsv.Script.fromHex(
                            BSV20V2.createTransferInsciption(
                                toByteString(tokenId, true),
                                10000n
                            )
                        ).add(
                            bsv.Script.fromHex(
                                Utils.buildPublicKeyHashScript(
                                    pubKey2Addr(current.bidder)
                                )
                            )
                        ),
                        satoshis: 1,
                    })
                )
                // Build auctioneer payment output.
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

    let callRes = await currentInstance.methods.close(
        (sigResps) => findSig(sigResps, publicKeyAuctioneer),
        {
            pubKeyOrAddrToSign: publicKeyAuctioneer,
            changeAddress: addressAuctioneer,
            lockTime: auctionDeadline + 1,
            sequence: 0,
            partiallySigned: true,
            exec: false, // Do not execute the contract yet, only get the created calling transaction.
        } as MethodCallOptions<BSV20Auction>
    )

    // If we would like to broadcast, here we need to sign ordinal UTXO input.
    const ordinalSig = signTx(
        callRes.tx,
        privateKeyAuctioneer,
        bsv.Script.fromHex(ordinalUTXO.script),
        ordinalUTXO.satoshis,
        0,
        bsv.crypto.Signature.ANYONECANPAY_SINGLE
    )

    callRes.tx.inputs[0].setScript(
        bsv.Script.fromASM(
            `${ordinalSig} ${publicKeyAuctioneer.toByteString()}`
        )
    )

    // Bind tx builder, that just simply re-uses the tx we created above.
    currentInstance.bindTxBuilder(
        'close',
        async (
            current: BSV20Auction,
            options: MethodCallOptions<BSV20Auction>
        ) => {
            return Promise.resolve({
                tx: callRes.tx,
                atInputIndex: 1,
                nexts: [],
            })
        }
    )

    callRes = await currentInstance.methods.close(
        (sigResps) => findSig(sigResps, publicKeyAuctioneer),
        {
            pubKeyOrAddrToSign: publicKeyAuctioneer,
            changeAddress: addressAuctioneer,
            lockTime: auctionDeadline + 1,
            sequence: 0,
        } as MethodCallOptions<BSV20Auction>
    )

    console.log('Close Tx: ', callRes.tx.id)
}

describe('Test SmartContract `BSV20Auction`', () => {
    it('should succeed', async () => {
        await main()
    })
})
