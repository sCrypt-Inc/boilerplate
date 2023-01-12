import { expect } from 'chai'
import { PubKey, PubKeyHash, Sig, bsv, toHex } from 'scrypt-ts'
import { Crowdfund } from '../../src/contracts/crowdfund'
import { inputIndex, dummyUTXO } from './util/txHelper'

const privateKeyRecipient = bsv.PrivateKey.fromRandom('testnet')
const pkhRecipient = bsv.crypto.Hash.sha256ripemd160(
    privateKeyRecipient.publicKey.toBuffer()
)

const privateKeyContributor = bsv.PrivateKey.fromRandom('testnet')
const privateKeyPublicKey = bsv.PublicKey.fromPrivateKey(privateKeyContributor)

describe('Test SmartContract `Crowdfund`', () => {
    before(async () => {
        await Crowdfund.compile()
    })

    it('should collect fund success', async () => {
        const oneDayAgo = new Date('2020-01-03')

        const deadline = Math.round(oneDayAgo.valueOf() / 1000)

        const crowdfund = new Crowdfund(
            PubKeyHash(toHex(pkhRecipient)),
            PubKey(toHex(privateKeyPublicKey)),
            BigInt(deadline),
            10000n
        )

        const utxos = [dummyUTXO]

        // construct a transaction for deployment
        const deployTx = crowdfund.getDeployTx(utxos, 1)

        const raisedAmount = 10000n
        const callTx = crowdfund.getCallCollectTx(
            deployTx,
            PubKeyHash(toHex(pkhRecipient)),
            raisedAmount
        )

        crowdfund.unlockFrom = { tx: callTx, inputIndex }
        const result = crowdfund.verify((self) => {
            self.collect(raisedAmount)
        })

        expect(result.success).to.be.true
    })

    it('should collect fund fail if  raisedAmount not reach target', async () => {
        const oneDayAgo = new Date('2020-01-03')

        const deadline = Math.round(oneDayAgo.valueOf() / 1000)

        const crowdfund = new Crowdfund(
            PubKeyHash(toHex(pkhRecipient)),
            PubKey(toHex(privateKeyPublicKey)),
            BigInt(deadline),
            10000n
        )

        const utxos = [dummyUTXO]

        // construct a transaction for deployment
        const deployTx = crowdfund.getDeployTx(utxos, 1)

        const raisedAmount = 100n

        expect(() => {
            crowdfund.getCallCollectTx(
                deployTx,
                PubKeyHash(toHex(pkhRecipient)),
                raisedAmount
            )
        }).to.throw(/Execution failed/)
    })

    it('should success when refund ', async () => {
        const deadline = Math.round(new Date('2020-01-03').valueOf() / 1000)

        const crowdfund = new Crowdfund(
            PubKeyHash(toHex(pkhRecipient)),
            PubKey(toHex(privateKeyPublicKey)),
            BigInt(deadline),
            10000n
        )

        const utxos = [dummyUTXO]

        // construct a transaction for deployment
        const deployTx = crowdfund.getDeployTx(utxos, 10000)

        const today = Math.round(new Date().valueOf() / 1000)

        const callTx = crowdfund.getCallRefundTx(
            deployTx,
            PubKeyHash(toHex(pkhRecipient)),
            privateKeyContributor,
            today
        )

        crowdfund.unlockFrom = { tx: callTx, inputIndex }
        const result = crowdfund.verify((self) => {
            self.refund(Sig(callTx.getSignature(0) as string))
        })

        expect(result.success).to.be.true
    })

    it('should fail when refund before deadline ', async () => {
        const deadline = Math.round(new Date('2020-01-03').valueOf() / 1000)

        const crowdfund = new Crowdfund(
            PubKeyHash(toHex(pkhRecipient)),
            PubKey(toHex(privateKeyPublicKey)),
            BigInt(deadline),
            10000n
        )

        const utxos = [dummyUTXO]

        // construct a transaction for deployment
        const deployTx = crowdfund.getDeployTx(utxos, 10000)

        const beforeDeadline = Math.round(
            new Date('2020-01-01').valueOf() / 1000
        )

        expect(() => {
            crowdfund.getCallRefundTx(
                deployTx,
                PubKeyHash(toHex(pkhRecipient)),
                privateKeyContributor,
                beforeDeadline
            )
        }).to.throw(/Execution failed/)
    })
})
