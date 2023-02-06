import {
    assert,
    bsv,
    FixedArray,
    checkMultiSig,
    method,
    prop,
    PubKey,
    PubKeyHash,
    Sig,
    SmartContract,
    toHex,
    UTXO,
    signTx,
    hash160,
} from 'scrypt-ts'

export class MultiSig extends SmartContract {
    // Number of key total.
    static readonly N = 3

    // Public key hashes.
    @prop()
    readonly pubKeyHashes: FixedArray<PubKeyHash, typeof MultiSig.N>

    constructor(pubKeyHashes: FixedArray<PubKeyHash, typeof MultiSig.N>) {
        super(...arguments)
        this.pubKeyHashes = pubKeyHashes
    }

    @method()
    public unlock(
        sigs: FixedArray<Sig, typeof MultiSig.N>,
        pubKeys: FixedArray<PubKey, typeof MultiSig.N>
    ) {
        // Check if public keys hash to the right addresses.
        for (let i = 0; i < MultiSig.N; i++) {
            assert(hash160(pubKeys[i]) == this.pubKeyHashes[i])
        }

        assert(checkMultiSig(sigs, pubKeys), 'Check multisig failed')
    }

    // Local method to construct deployment TX.
    getDeployTx(utxos: UTXO[], initBalance: number): bsv.Transaction {
        const tx = new bsv.Transaction().from(utxos).addOutput(
            new bsv.Transaction.Output({
                script: this.lockingScript,
                satoshis: initBalance,
            })
        )
        this.lockTo = { tx, outputIndex: 0 }
        return tx
    }

    // Local method to construct TX calling a deployed contract.
    getCallTx(
        pubKeys: bsv.PublicKey[],
        privKeys: bsv.PrivateKey[],
        prevTx: bsv.Transaction
    ): bsv.Transaction {
        const inputIndex = 0

        const tx = new bsv.Transaction().addInputFromPrevTx(prevTx)

        const sigs = [...Array(MultiSig.N)].map((_, i) => {
            tx.getSignature(inputIndex)
            const prevOut = tx.outputs[inputIndex]
            return signTx(
                tx,
                privKeys[i],
                prevOut.script,
                prevOut.satoshis,
                inputIndex
            )
        })

        return tx.setInputScript(inputIndex, (tx) => {
            this.unlockFrom = { tx, inputIndex }
            return this.getUnlockingScript((self) => {
                self.unlock(
                    sigs.map((sig) => {
                        return Sig(toHex(sig)) // TODO: sig as string?
                    }) as FixedArray<Sig, typeof MultiSig.N>,
                    pubKeys.map((pubKey) => {
                        return PubKey(toHex(pubKey))
                    }) as FixedArray<PubKey, typeof MultiSig.N>
                )
            })
        })
    }
}
