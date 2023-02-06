import { expect } from 'chai'
import {
    bsv,
    toHex,
    PubKey,
    Sig,
    signTx,
    PubKeyHash,
    FixedArray,
} from 'scrypt-ts'
import { MultiSig } from '../../src/contracts/multiSig'
import {
    newTx,
    inputIndex,
    inputSatoshis,
    randomPrivateKey,
} from './util/txHelper'

describe('Test SmartContract `MultiSig`', () => {
    const [privateKey1, publicKey1, publicKeyHash1] = randomPrivateKey()
    const [privateKey2, publicKey2, publicKeyHash2] = randomPrivateKey()
    const [privateKey3, publicKey3, publicKeyHash3] = randomPrivateKey()

    const [privateKeyWrong, _, publicKeyHashWrong] = randomPrivateKey()

    before(async () => {
        await MultiSig.compile()
    })

    it('should succeed with all correct sigs', () => {
        const pubKeysHashes: FixedArray<PubKeyHash, typeof MultiSig.N> = [
            PubKeyHash(toHex(publicKeyHash1)),
            PubKeyHash(toHex(publicKeyHash2)),
            PubKeyHash(toHex(publicKeyHash3)),
        ]
        const multiSig = new MultiSig(pubKeysHashes)

        const tx = newTx()

        multiSig.unlockFrom = { tx, inputIndex }

        const result = multiSig.verify((self) => {
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

            self.unlock(
                [Sig(toHex(sig1)), Sig(toHex(sig2)), Sig(toHex(sig3))],
                [
                    PubKey(toHex(publicKey1)),
                    PubKey(toHex(publicKey2)),
                    PubKey(toHex(publicKey3)),
                ]
            )
        })

        expect(result.success, result.error).to.eq(true)
    })

    it('should fail with a wrong sig', () => {
        const pubKeysHashes: FixedArray<PubKeyHash, typeof MultiSig.N> = [
            PubKeyHash(toHex(publicKeyHash1)),
            PubKeyHash(toHex(publicKeyHash2)),
            PubKeyHash(toHex(publicKeyHash3)),
        ]
        const multiSig = new MultiSig(pubKeysHashes)

        const tx = newTx()

        multiSig.unlockFrom = { tx, inputIndex }

        const result = multiSig.verify((self) => {
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

            self.unlock(
                [Sig(toHex(sig1)), Sig(toHex(sig2)), Sig(toHex(sig3))],
                [
                    PubKey(toHex(publicKey1)),
                    PubKey(toHex(publicKey2)),
                    PubKey(toHex(publicKey3)),
                ]
            )
        })

        expect(result.success, result.error).to.eq(false)
    })

    it('should fail with a wrong pubKey', () => {
        const pubKeysHashes: FixedArray<PubKeyHash, typeof MultiSig.N> = [
            PubKeyHash(toHex(publicKeyHash1)),
            PubKeyHash(toHex(publicKeyHashWrong)),
            PubKeyHash(toHex(publicKeyHash3)),
        ]
        const multiSig = new MultiSig(pubKeysHashes)

        const tx = newTx()

        multiSig.unlockFrom = { tx, inputIndex }

        expect(() => {
            multiSig.verify((self) => {
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

                self.unlock(
                    [Sig(toHex(sig1)), Sig(toHex(sig2)), Sig(toHex(sig3))],
                    [
                        PubKey(toHex(publicKey1)),
                        PubKey(toHex(publicKey2)),
                        PubKey(toHex(publicKey3)),
                    ]
                )
            })
        }).to.throw(/Execution failed/)
    })
})
