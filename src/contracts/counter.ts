import {
    SigHash,
    assert,
    bsv,
    hash256,
    method,
    prop,
    SmartContract,
    UTXO,
} from 'scrypt-ts'

export class Counter extends SmartContract {
    // Stateful prop to store counters value.
    @prop(true)
    count: bigint

    // Current balance of the contract. This is only stored locally.
    private balance: number

    constructor(count: bigint) {
        super(...arguments)
        this.count = count
    }

    @method(SigHash.ANYONECANPAY_SINGLE)
    public increment() {
        // Increment counter value
        this.count++

        // Ensure next output will contain the updated counter value.
        // I.e. actual output hash matches the one in the tx context.
        assert(
            this.ctx.hashOutputs ==
                hash256(this.buildStateOutput(this.ctx.utxo.value)),
            'hashOutputs check failed'
        )
    }

    // Local method to construct deployment TX.
    getDeployTx(utxos: UTXO[], initBalance: number): bsv.Transaction {
        this.balance = initBalance
        const tx = new bsv.Transaction().from(utxos).addOutput(
            new bsv.Transaction.Output({
                script: this.lockingScript,
                satoshis: initBalance,
            })
        )
        this.lockTo = { tx, outputIndex: 0 }
        return tx
    }

    // Local method to construct TX calling deployed smart contract.
    getCallTx(
        utxos: UTXO[],
        prevTx: bsv.Transaction,
        nextInst: Counter
    ): bsv.Transaction {
        const inputIndex = 0
        return new bsv.Transaction()
            .addInputFromPrevTx(prevTx)
            .from(utxos)
            .setOutput(0, (tx: bsv.Transaction) => {
                nextInst.lockTo = { tx, outputIndex: 0 }
                return new bsv.Transaction.Output({
                    script: nextInst.lockingScript,
                    satoshis: this.balance,
                })
            })
            .setInputScript(
                {
                    inputIndex,
                    sigtype: bsv.crypto.Signature.ANYONECANPAY_SINGLE,
                },
                (tx: bsv.Transaction) => {
                    this.unlockFrom = { tx, inputIndex }
                    return this.getUnlockingScript((self) => {
                        self.increment()
                    })
                }
            )
    }
}
