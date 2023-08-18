import { getDefaultSigner, randomPrivateKey, sleep } from './utils/helper'
import {
    bsv,
    ByteString,
    findSig,
    hash160,
    int2ByteString,
    MethodCallOptions,
    PubKey,
    PubKeyHash,
    reverseByteString,
    Sig,
    toByteString,
    toHex,
    Utils,
    UTXO,
} from 'scrypt-ts'
import { myPrivateKey, myPublicKey } from './utils/privateKey'
import { OrdinalAuction } from '../src/contracts/ordinalAuction'
import { signTx } from 'scryptlib'

async function deployOrdinal(dest: PubKeyHash, msg: string): Promise<UTXO> {
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

async function main() {
    await OrdinalAuction.compile()

    const privateKeyAuctioneer = myPrivateKey
    const publicKeyAuctioneer = myPublicKey
    const addressAuctioneer = publicKeyAuctioneer.toAddress()

    const bidderPrivateKeys: bsv.PrivateKey[] = []
    const bidderPublicKeys: bsv.PublicKey[] = []
    const bidderAddresses: bsv.Address[] = []
    for (let i = 0; i < 3; i++) {
        const [privateKeyBidder, publicKeyBidder, , addressBidder] =
            randomPrivateKey()
        bidderPrivateKeys.push(privateKeyBidder)
        bidderPublicKeys.push(publicKeyBidder)
        bidderAddresses.push(addressBidder)
    }

    const auctionDeadline = Math.round(new Date('2020-01-03').valueOf() / 1000)

    const ordinalUTXO = await deployOrdinal(
        hash160(publicKeyAuctioneer.toHex()),
        'Hello, sCrypt!'
    )
    console.log('Ordinal deployed:', ordinalUTXO.txId)

    await sleep(3)

    const ordinalPrevout: ByteString =
        reverseByteString(toByteString(ordinalUTXO.txId), 32n) +
        int2ByteString(BigInt(ordinalUTXO.outputIndex), 4n)

    const auction = new OrdinalAuction(
        ordinalPrevout,
        PubKey(toHex(publicKeyAuctioneer)),
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
        const newHighestBidder = PubKey(toHex(bidderPublicKeys[i]))
        const bid = BigInt(balance + 1)

        const nextInstance = currentInstance.next()
        nextInstance.bidder = newHighestBidder

        const contractTx = await currentInstance.methods.bid(
            newHighestBidder,
            bid,
            {
                changeAddress: bidderAddresses[i],
                next: {
                    instance: nextInstance,
                    balance: Number(bid),
                },
            } as MethodCallOptions<OrdinalAuction>
        )

        console.log('Bid Tx:', contractTx.tx.id)

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
                        script: bsv.Script.fromHex('00'.repeat(34)),
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
                                hash160(current.auctioneer)
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

    let contractTx = await currentInstance.methods.close(
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
        0
    )
    contractTx.tx.inputs[0] = new bsv.Transaction.Input({
        prevTxId: ordinalUTXO.txId,
        outputIndex: ordinalUTXO.outputIndex,
        script: bsv.Script.fromASM(
            `${ordinalSig} ${publicKeyAuctioneer.toHex()}`
        ),
    })
    contractTx.tx.inputs[0].output = new bsv.Transaction.Output({
        script: bsv.Script.fromHex(ordinalUTXO.script),
        satoshis: ordinalUTXO.satoshis,
    })

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

    contractTx = await currentInstance.methods.close(
        (sigResps) => findSig(sigResps, publicKeyAuctioneer),
        {
            pubKeyOrAddrToSign: publicKeyAuctioneer,
            changeAddress: addressAuctioneer,
            lockTime: auctionDeadline + 1,
            sequence: 0,
        } as MethodCallOptions<OrdinalAuction>
    )

    console.log('Close Tx: ', contractTx.tx.id)
}

describe('Test SmartContract `OrdinalAuction`', () => {
    it('should succeed', async () => {
        await main()
    })
})
