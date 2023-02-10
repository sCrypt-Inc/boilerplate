import {
    assert,
    bsv,
    buildPublicKeyHashScript,
    ByteString,
    hash256,
    method,
    prop,
    PubKeyHash,
    SigHash,
    SmartContract,
    Utils,
    UTXO,
} from 'scrypt-ts'

export class AnyoneCanSpend extends SmartContract {
    // Address of the recipient.
    @prop()
    readonly pubKeyHash: PubKeyHash

    constructor(pubKeyHash: PubKeyHash) {
        super(...arguments)
        this.pubKeyHash = pubKeyHash
    }

    @method(SigHash.ANYONECANPAY_SINGLE)
    public unlock(outputAmount: bigint) {
        const lockingScript: ByteString = Utils.buildPublicKeyHashScript(
            this.pubKeyHash
        )
        const output: ByteString = Utils.buildOutput(
            lockingScript,
            outputAmount
        )
        assert(
            hash256(output) == this.ctx.hashOutputs,
            'hashOutputs check failed'
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
    // Due to our choice of SIGHASH flags, anyone can add an extra
    // input to the transaction.
    getCallTx(
        prevTx: bsv.Transaction,
        changeAddress: PubKeyHash
    ): bsv.Transaction {
        const inputIndex = 0
        return new bsv.Transaction()
            .addInputFromPrevTx(prevTx)
            .setOutput(0, (tx) => {
                return new bsv.Transaction.Output({
                    script: buildPublicKeyHashScript(changeAddress),
                    satoshis: tx.inputAmount - tx.getChangeAmount(),
                })
            })
            .setInputScript(
                {
                    inputIndex,
                    sigtype: bsv.crypto.Signature.ANYONECANPAY_SINGLE,
                },
                (tx) => {
                    this.to = { tx, inputIndex }
                    return this.getUnlockingScript((self) => {
                        self.unlock(BigInt(tx.getOutputAmount(0)))
                    })
                }
            )
    }
}
