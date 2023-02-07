import { expect } from 'chai'
import { Ripemd160, bsv, toHex, PubKey, Sig, signTx } from 'scrypt-ts'
import { AccumulatorMultiSig } from '../../src/contracts/accumulatorMultiSig'
import {
    newTx,
    inputIndex,
    inputSatoshis,
    randomPrivateKey,
} from './util/txHelper'

describe('Test SmartContract `AccumulatorMultiSig`', () => {
    const [privateKey1, publicKey1, publicKeyHash1] = randomPrivateKey()
    const [privateKey2, publicKey2, publicKeyHash2] = randomPrivateKey()
    const [privateKey3, publicKey3, publicKeyHash3] = randomPrivateKey()

    const privateKeyWrong = bsv.PrivateKey.fromRandom('testnet')

    before(async () => {
        await AccumulatorMultiSig.compile()
    })

    it('should successfully with all three right.', () => {
        const accumulatorMultiSig = new AccumulatorMultiSig(2n, [
            Ripemd160(toHex(publicKeyHash1)),
            Ripemd160(toHex(publicKeyHash2)),
            Ripemd160(toHex(publicKeyHash3)),
        ])

        const tx = newTx()

        accumulatorMultiSig.to = { tx, inputIndex }

        const result = accumulatorMultiSig.verify((self) => {
            const sig1 = signTx(
                tx,
                privateKey1,
                self.lockingScript,
                inputSatoshis
            )

            const sig2 = signTx(
                tx,
                privateKey2,
                self.lockingScript,
                inputSatoshis
            )

            const sig3 = signTx(
                tx,
                privateKey3,
                self.lockingScript,
                inputSatoshis
            )

            self.main(
                [
                    PubKey(toHex(publicKey1)),
                    PubKey(toHex(publicKey2)),
                    PubKey(toHex(publicKey3)),
                ],
                [Sig(toHex(sig1)), Sig(toHex(sig2)), Sig(toHex(sig3))],
                [true, true, true]
            )
        })

        expect(result.success, result.error).to.eq(true)
    })

    it('should successfully with two right.', () => {
        const accumulatorMultiSig = new AccumulatorMultiSig(2n, [
            Ripemd160(toHex(publicKeyHash1)),
            Ripemd160(toHex(publicKeyHash2)),
            Ripemd160(toHex(publicKeyHash3)),
        ])

        const tx = newTx()

        accumulatorMultiSig.to = { tx, inputIndex }

        const result = accumulatorMultiSig.verify((self) => {
            const sig1 = signTx(
                tx,
                privateKey1,
                self.lockingScript,
                inputSatoshis
            )

            const sig2 = signTx(
                tx,
                privateKey2,
                self.lockingScript,
                inputSatoshis
            )

            const sig3 = signTx(
                tx,
                privateKeyWrong,
                self.lockingScript,
                inputSatoshis
            )

            self.main(
                [
                    PubKey(toHex(publicKey1)),
                    PubKey(toHex(publicKey2)),
                    PubKey(toHex(publicKey3)),
                ],
                [Sig(toHex(sig1)), Sig(toHex(sig2)), Sig(toHex(sig3))],
                [true, true, false]
            )
        })

        expect(result.success, result.error).to.eq(true)
    })

    it('should throw with only one right.', () => {
        const accumulatorMultiSig = new AccumulatorMultiSig(2n, [
            Ripemd160(toHex(publicKeyHash1)),
            Ripemd160(toHex(publicKeyHash2)),
            Ripemd160(toHex(publicKeyHash3)),
        ])

        const tx = newTx()

        accumulatorMultiSig.to = { tx, inputIndex }

        expect(() => {
            const sig1 = signTx(
                tx,
                privateKey1,
                accumulatorMultiSig.lockingScript,
                inputSatoshis
            )

            const sig2 = signTx(
                tx,
                privateKeyWrong,
                accumulatorMultiSig.lockingScript,
                inputSatoshis
            )

            const sig3 = signTx(
                tx,
                privateKeyWrong,
                accumulatorMultiSig.lockingScript,
                inputSatoshis
            )

            accumulatorMultiSig.main(
                [
                    PubKey(toHex(publicKey1)),
                    PubKey(toHex(publicKey2)),
                    PubKey(toHex(publicKey3)),
                ],
                [Sig(toHex(sig1)), Sig(toHex(sig2)), Sig(toHex(sig3))],
                [true, false, false]
            )
        }).to.throw(
            /the number of signatures does not meet the threshold limit/
        )
    })
})
