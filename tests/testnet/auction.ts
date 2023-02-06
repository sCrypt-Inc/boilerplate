import { Auction } from '../../src/contracts/auction'
import {
    fetchUtxos,
    getTestnetSigner,
    inputIndex,
    outputIndex,
    sleep,
    testnetDefaultSigner,
} from './util/txHelper'
import {
    bsv,
    PubKey,
    PubKeyHash,
    Sig,
    toHex,
    utxoFromOutput,
    buildPublicKeyHashScript,
} from 'scrypt-ts'
import {
    myAddress,
    myPrivateKey,
    myPublicKey,
    myPublicKeyHash,
} from './util/privateKey'

async function main() {
    await Auction.compile()

    const privateKeyAuctioneer = myPrivateKey
    const publicKeyAuctioneer = myPublicKey
    const addressAuctioneer = myAddress

    const publicKeyHashHighestBidder = myPublicKeyHash
    const publicKeyHashNewBidder = myPublicKeyHash
    const auctionDeadline = BigInt(
        // JS timestamps are in milliseconds, so we divide by 1000 to get an UNIX timestamp
        Math.round(new Date('2020-01-03').valueOf() / 1000)
    )
    const timeNow = Math.floor(Date.now() / 1000)

    const auction = new Auction(
        PubKeyHash(toHex(publicKeyHashHighestBidder)),
        PubKey(toHex(publicKeyAuctioneer)),
        auctionDeadline
    ).markAsGenesis()

    const signer = await getTestnetSigner(privateKeyAuctioneer)
    await auction.connect(signer)

    const highestBid = 1000
    const newBid = highestBid * 2
    const changeAddress = await signer.getDefaultAddress()

    // contract deployment
    const deployTx = await auction.deploy(highestBid)
    console.log('Auction contract deployed: ', deployTx.id)

    // contract call `bid`
    // avoid mempool conflicts, sleep to allow previous tx "sink-into" the network
    await sleep(5)
    // 1. build a new contract instance
    const newInstance = auction.next()
    newInstance.bidder = PubKeyHash(toHex(publicKeyHashNewBidder))
    // 2. construct a transaction for contract call
    const unsignedCallBidTx: bsv.Transaction = await new bsv.Transaction()
        // contract previous state input
        .addInputFromPrevTx(deployTx)
        // gas inputs
        .from(await fetchUtxos())
        // contract new state output
        .setOutput(outputIndex, (tx: bsv.Transaction) => {
            newInstance.lockTo = { tx, outputIndex }
            return new bsv.Transaction.Output({
                script: newInstance.lockingScript,
                satoshis: newBid, // continues with a higher bid
            })
        })
        // contract refund output
        .setOutput(1, () => {
            return new bsv.Transaction.Output({
                script: buildPublicKeyHashScript(
                    PubKeyHash(toHex(publicKeyHashHighestBidder))
                ),
                satoshis: highestBid, // refund previous highest bid
            })
        })
        // change output
        .change(changeAddress)
        .setInputScriptAsync(inputIndex, (tx: bsv.Transaction) => {
            // bind contract & tx unlocking relation
            auction.unlockFrom = { tx, inputIndex }

            // use the cloned version because this callback may be executed multiple times during tx building process,
            // and calling contract method may have side effects on its properties.
            return auction.getUnlockingScript(async (cloned) => {
                cloned.bid(
                    PubKeyHash(toHex(publicKeyHashNewBidder)),
                    BigInt(newBid),
                    BigInt(tx.getChangeAmount())
                )
            })
        })
    const bidTx = await (
        await testnetDefaultSigner
    ).signAndsendTransaction(unsignedCallBidTx)
    console.log('Bid Tx: ', bidTx.id)

    // contract call `close`
    // avoid mempool conflicts, sleep to allow previous tx "sink-into" the network
    await sleep(5)
    const unsignedCallCloseTx: bsv.Transaction = await new bsv.Transaction()
        .addInputFromPrevTx(bidTx)
        .change(changeAddress)
        .setInputSequence(inputIndex, 0)
        .setLockTime(timeNow)
        .setInputScriptAsync(inputIndex, (tx: bsv.Transaction) => {
            // bind contract & tx unlocking relation
            newInstance.unlockFrom = { tx, inputIndex }

            // use the cloned version because this callback may be executed multiple times during tx building process,
            // and calling contract method may have side effects on its properties.
            return newInstance.getUnlockingScript(async (cloned) => {
                const spendingUtxo = utxoFromOutput(bidTx, outputIndex)

                const sigResponses = await (
                    await testnetDefaultSigner
                ).getSignatures(tx.toString(), [
                    {
                        inputIndex,
                        satoshis: spendingUtxo.satoshis,
                        scriptHex: spendingUtxo.script,
                        address: addressAuctioneer,
                    },
                ])

                const sigs = sigResponses.map((sigResp) => sigResp.sig)
                cloned.close(Sig(sigs[0]))
            })
        })
    const closeTx = await (
        await testnetDefaultSigner
    ).signAndsendTransaction(unsignedCallCloseTx)
    console.log('Close Tx: ', closeTx.id)
}

describe('Test SmartContract `Auction` on testnet', () => {
    it('should succeed', async () => {
        await main()
    })
})
