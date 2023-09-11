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

async function deployOrdinal(dest: Addr, msg: string): Promise<UTXO> {
    const signer = getDefaultSigner()
    await signer.provider?.connect()

    const address = await signer.getDefaultAddress()

    // TODO: pick only as many utxos as needed
    const utxos = await signer.listUnspent(address)

    // Add msg as text/plain inscription.
    const msgBuff = Buffer.from(msg, 'utf8')
    const msgHex = msgBuff.toString('hex')
    const inscription = bsv.Script.fromASM(
        `OP_FALSE OP_IF 6f7264 OP_TRUE 746578742f706c61696e OP_FALSE ${msgHex} OP_ENDIF`
    )

    const unsignedTx = new bsv.Transaction()
        .from(utxos)
        .addOutput(
            new bsv.Transaction.Output({
                script: bsv.Script.fromHex(
                    Utils.buildPublicKeyHashScript(dest)
                ).add(inscription),
                satoshis: 1,
            })
        )
        .change(address)

    const resp = await signer.signAndsendTransaction(unsignedTx, { address })

    return {
        txId: resp.id,
        outputIndex: 0,
        script: resp.outputs[0].script.toHex(),
        satoshis: resp.outputs[0].satoshis,
    }
}

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

        ordinalUTXO = await deployOrdinal(
            Addr(addressAuctioneer.toByteString()),
            'Hello, sCrypt!'
        )
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
