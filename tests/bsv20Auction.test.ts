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
    UTXO,
} from 'scrypt-ts'
import { myPrivateKey, myPublicKey } from './utils/privateKey'
import { BSV20Auction } from '../src/contracts/bsv20Auction'
import { signTx } from 'scryptlib'

function jsonToUtf8Hex(jsonObject: any): string {
    // Convert JSON object to a string
    const jsonString = JSON.stringify(jsonObject)

    // Encode the string using UTF-8 encoding
    const utf8Bytes = new TextEncoder().encode(jsonString)

    // Convert encoded bytes to hexadecimal string
    let utf8Hex = ''
    for (const byte of utf8Bytes) {
        utf8Hex += byte.toString(16).padStart(2, '0')
    }

    return utf8Hex
}

function getMockBSV20TransferInscription(
    tick: string,
    amt: number
): bsv.Script {
    const msg = {
        p: 'bsv-20',
        op: 'transfer',
        tick: tick,
        amt: amt.toString(),
    }
    const msgBuff = Buffer.from(JSON.stringify(msg), 'utf8')
    const msgHex = msgBuff.toString('hex')
    return bsv.Script.fromASM(
        `OP_FALSE OP_IF 6f7264 OP_TRUE 6170706c69636174696f6e2f6273762d3230 OP_FALSE ${msgHex} OP_ENDIF`
    )
}

async function deployInscription(
    dest: Addr,
    inscription: bsv.Script
): Promise<UTXO> {
    const signer = getDefaultSigner()
    await signer.provider?.connect()

    const address = await signer.getDefaultAddress()

    // TODO: pick only as many utxos as needed
    const utxos = await signer.listUnspent(address)

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

    const transferInscription = getMockBSV20TransferInscription('ordi', 1000)
    const ordinalUTXO = await deployInscription(
        Addr(publicKeyAuctioneer.toAddress().toByteString()),
        transferInscription
    )
    console.log('Mock BSV-20 ordinal deployed:', ordinalUTXO.txId)

    await sleep(3)

    const ordinalPrevout: ByteString =
        reverseByteString(toByteString(ordinalUTXO.txId), 32n) +
        int2ByteString(BigInt(ordinalUTXO.outputIndex), 4n)

    const auction = new BSV20Auction(
        ordinalPrevout,
        toByteString(transferInscription.toHex()),
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

        const contractTx = await currentInstance.methods.bid(
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

        console.log('Bid Tx:', contractTx.tx.id)

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

            // Build ordinal destination output
            // and inscribe with transfer data.
            unsignedTx
                .addOutput(
                    new bsv.Transaction.Output({
                        script: transferInscription.add(
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

    let contractTx = await currentInstance.methods.close(
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
        contractTx.tx,
        privateKeyAuctioneer,
        bsv.Script.fromHex(ordinalUTXO.script),
        ordinalUTXO.satoshis,
        0,
        bsv.crypto.Signature.ANYONECANPAY_SINGLE
    )

    contractTx.tx.inputs[0].setScript(
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
        } as MethodCallOptions<BSV20Auction>
    )

    console.log('Close Tx: ', contractTx.tx.id)
}

describe('Test SmartContract `BSV20Auction`', () => {
    it('should succeed', async () => {
        await main()
    })
})
