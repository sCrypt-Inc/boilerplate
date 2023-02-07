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
    // Number of multisig participants.
    @prop()
    static readonly N = 3n

    // Threshold of the signatures needed.
    @prop()
    threshold: bigint

    // Addresses.
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
        masks: FixedArray<boolean, 3> // Mask the unused signatures with `false`
    ) {
        let total = 0n
        for (let i = 0; i < AccumulatorMultiSig.N; i++) {
            if (masks[i]) {
                if (
                    // Ensure the public key belongs to the specified address.
                    hash160(pubKeys[i]) == this.pubKeyHashes[i] &&
                    // Check the signature
                    this.checkSig(sigs[i], pubKeys[i])
                ) {
                    total++ // Increment the number of successful signature checks.
                }
            }
        }
        assert(
            total >= this.threshold,
            'the number of signatures does not meet the threshold limit'
        )
    }

    // Local method to construct deployment TX.
    getDeployTx(utxos: UTXO[], initBalance: number): bsv.Transaction {
        const tx = new bsv.Transaction().from(utxos).addOutput(
            new bsv.Transaction.Output({
                script: this.lockingScript,
                satoshis: initBalance,
            })
        )
        this.from = { tx, outputIndex: 0 }
        return tx
    }

    // Local method to construct TX calling a deployed contract.
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
                this.to = { tx, inputIndex }
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
