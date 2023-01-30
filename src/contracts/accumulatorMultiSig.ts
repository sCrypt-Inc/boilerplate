import {
    assert,
    bsv,
    FixedArray,
    hash160,
    method,
    prop,
    PubKey,
    Ripemd160,
    Sig,
    SmartContract,
    toHex,
    UTXO,
} from 'scrypt-ts'

export class AccumulatorMultiSig extends SmartContract {
    public static readonly N: number = 3
    @prop()
    threshold: bigint
    @prop()
    pubKeyHashes: FixedArray<Ripemd160, 3>

    constructor(threshold: bigint, pubKeyHashes: FixedArray<Ripemd160, 3>) {
        super(...arguments)
        this.threshold = threshold
        this.pubKeyHashes = pubKeyHashes
    }

    @method()
    public main(
        pubKeys: FixedArray<PubKey, 3>,
        sigs: FixedArray<Sig, 3>,
        masks: FixedArray<boolean, 3>
    ) {
        let total = 0n
        for (let i = 0; i < AccumulatorMultiSig.N; i++) {
            if (masks[i]) {
                if (
                    hash160(pubKeys[i]) == this.pubKeyHashes[i] &&
                    this.checkSig(sigs[i], pubKeys[i])
                ) {
                    total++
                }
            }
        }
        assert(
            total >= this.threshold,
            'the number of signatures does not meet the threshold limit'
        )
    }

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

    getCallTx(
        pubKeys: bsv.PublicKey[],
        privateKey: bsv.PrivateKey[],
        prevTx: bsv.Transaction
    ): bsv.Transaction {
        const inputIndex = 0
        return new bsv.Transaction().addInputFromPrevTx(prevTx).setInputScript(
            {
                inputIndex,
                privateKey,
            },
            (tx) => {
                const sigs = tx.getSignature(inputIndex)
                this.unlockFrom = { tx, inputIndex }
                return this.getUnlockingScript((self) => {
                    self.main(
                        [
                            PubKey(toHex(pubKeys[0])),
                            PubKey(toHex(pubKeys[1])),
                            PubKey(toHex(pubKeys[2])),
                        ],
                        [Sig(sigs[0]), Sig(sigs[1]), Sig(sigs[2])],
                        [true, true, true]
                    )
                })
            }
        )
    }
}
