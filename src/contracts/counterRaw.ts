import {
    assert,
    bsv,
    ByteString,
    hash256,
    int2str,
    len,
    method,
    SmartContract,
    unpack,
    Utils,
} from 'scrypt-ts'
import { UTXO } from '../types'

export class CounterRaw extends SmartContract {
    static readonly DATA_LEN: bigint = 1n

    @method()
    public increment(amount: bigint) {
        // deserialize state (i.e., counter value)
        const scriptCode: ByteString = this.ctx.utxo.scriptCode

        const scriptLen = BigInt(len(scriptCode))
        // counter is at the end
        let counter: bigint = unpack(
            scriptCode.slice(
                Number((scriptLen - CounterRaw.DATA_LEN) * 2n),
                Number(scriptLen * 2n)
            )
        )

        // increment counter
        counter++

        // serialize state
        const outputScript: ByteString =
            scriptCode.slice(0, Number(scriptLen - CounterRaw.DATA_LEN) * 2) +
            int2str(counter, BigInt(CounterRaw.DATA_LEN))

        const output: ByteString = Utils.buildOutput(outputScript, amount)

        assert(
            hash256(output) == this.ctx.hashOutputs,
            'hashOutputs check failed'
        )
    }

    getDeployTx(utxos: UTXO[], initBalance: number): bsv.Transaction {
        this.setDataPartInASM(int2str(BigInt(0), 1n))
        const tx = new bsv.Transaction().from(utxos).addOutput(
            new bsv.Transaction.Output({
                script: this.lockingScript,
                satoshis: initBalance,
            })
        )
        this.lockTo = { tx, outputIndex: 0 }
        return tx
    }

    getCallTx(prevTx: bsv.Transaction, nextInst: CounterRaw): bsv.Transaction {
        const inputIndex = 0
        return new bsv.Transaction()
            .addInputFromPrevTx(prevTx)
            .setOutput(0, (tx: bsv.Transaction) => {
                nextInst.lockTo = { tx, outputIndex: 0 }
                return new bsv.Transaction.Output({
                    script: nextInst.lockingScript,
                    satoshis: tx.inputAmount - tx.getEstimateFee(),
                })
            })
            .setInputScript(inputIndex, (tx: bsv.Transaction) => {
                this.unlockFrom = { tx, inputIndex }
                return this.getUnlockingScript((self) => {
                    self.increment(BigInt(tx.getOutputAmount(0)))
                })
            })
    }
}
