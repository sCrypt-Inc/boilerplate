import { expect } from 'chai'
import { Auction } from '../../src/contracts/auction'
import { bsv, PubKeyHash, Sig, signTx, toHex, PubKey } from 'scrypt-ts'
import { dummyUTXO, newTx, inputIndex, inputSatoshis } from './util/txHelper'

const privateKeyAuctioneer = bsv.PrivateKey.fromRandom('testnet')
const publicKeyAuctioneer = bsv.PublicKey.fromPrivateKey(privateKeyAuctioneer)

const privateKeyBidder = bsv.PrivateKey.fromRandom('testnet')
const publicKeyBidder = bsv.PublicKey.fromPrivateKey(privateKeyBidder)
const publicKeyHashBidder = bsv.crypto.Hash.sha256ripemd160(
    publicKeyBidder.toBuffer()
)

const oneDayAgo = new Date('2020-01-03')
const auctionDeadline = BigInt(Math.round(oneDayAgo.valueOf() / 1000))

describe('Test SmartContract `Auction` on testnet', () => {
    before(async () => {
        await Auction.compile()
    })

    it('should pass Bid call', async () => {
        await bidCallTest()
    })

    it('should pass Close call', async () => {
        await closeCallTest()
    })
})

async function bidCallTest() {
    const privateKeyHighestBid = bsv.PrivateKey.fromRandom('testnet')
    const publicKeyHighestBid =
        bsv.PublicKey.fromPrivateKey(privateKeyHighestBid)
    const publicKeyHashHighestBid = bsv.crypto.Hash.sha256ripemd160(
        publicKeyHighestBid.toBuffer()
    )
    const addressHighestBid = privateKeyHighestBid.toAddress()

    const privateKeyAuctioneer = bsv.PrivateKey.fromRandom('testnet')
    const publicKeyAuctioneer =
        bsv.PublicKey.fromPrivateKey(privateKeyAuctioneer)

    const privateKeyNewBid = bsv.PrivateKey.fromRandom('testnet')
    const publicKeyNewBid = bsv.PublicKey.fromPrivateKey(privateKeyNewBid)
    const publicKeyHashNewBid = bsv.crypto.Hash.sha256ripemd160(
        publicKeyNewBid.toBuffer()
    )
    const addressNewBid = privateKeyNewBid.toAddress()

    const bid = inputSatoshis + 10000

    const FEE = 5000

    const payInputSatoshis = 200000

    const changeSatoshis = payInputSatoshis - bid - FEE

    const oneDayAgo = new Date('2020-01-03')
    const auctionDeadline = BigInt(Math.round(oneDayAgo.valueOf() / 1000))

    const auction = new Auction(
        PubKeyHash(toHex(publicKeyHashHighestBid)),
        PubKey(toHex(publicKeyAuctioneer)),
        auctionDeadline
    ).markAsGenesis()

    const initBalance = 10000

    const newInstance = auction.next()

    const outputIndex = 0
    const inputIndex = 0
    newInstance.bidder = PubKeyHash(toHex(publicKeyHashNewBid))

    const callTx: bsv.Transaction = new bsv.Transaction()
        .addDummyInput(auction.lockingScript, initBalance)
        .setOutput(outputIndex, () => {
            // bind contract & tx locking relation
            return new bsv.Transaction.Output({
                // use the locking script of newInstance, as the locking script of the new UTXO
                script: newInstance.lockingScript,
                satoshis: bid,
            })
        })
        .addOutput(
            new bsv.Transaction.Output({
                script: bsv.Script.buildPublicKeyHashOut(addressHighestBid),
                satoshis: inputSatoshis,
            })
        )
        .addOutput(
            new bsv.Transaction.Output({
                script: bsv.Script.buildPublicKeyHashOut(addressNewBid),
                satoshis: changeSatoshis,
            })
        )
        .setInputScript(inputIndex, (tx: bsv.Transaction) => {
            // bind contract & tx unlocking relation
            // use the cloned version because this callback will be executed multiple times during tx building process,
            // and calling contract method may have side effects on its properties.
            return auction.getUnlockingScript((cloned) => {
                // call previous counter's public method to get the unlocking script.
                cloned.unlockFrom = { tx, inputIndex }
                cloned.bid(
                    PubKeyHash(toHex(publicKeyHashNewBid)),
                    BigInt(bid),
                    BigInt(changeSatoshis)
                )
            })
        })
        .seal()

    const result = callTx.verifyInputScript(0)

    expect(result.success, result.error).to.eq(true)
}

async function closeCallTest() {
    const auctionDeadline = 0n
    // new instance
    const instance = new Auction(
        PubKeyHash(toHex(publicKeyHashBidder)),
        PubKey(toHex(publicKeyAuctioneer)),
        auctionDeadline
    )
    // unlockFrom for stateful contract
    dummyUTXO.script = instance.lockingScript.toHex()
    const utxos = [dummyUTXO]
    const tx = newTx(utxos)
    instance.unlockFrom = { tx, inputIndex }
    // instance.verify
    const result = instance.verify((self) => {
        const sig = signTx(
            tx,
            privateKeyAuctioneer,
            self.lockingScript,
            inputSatoshis
        )
        self.close(Sig(toHex(sig)))
    })
    // expect result
    expect(result.success, result.error).to.be.true
}
