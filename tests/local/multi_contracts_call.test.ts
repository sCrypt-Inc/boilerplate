import {
    MethodCallOptions,
    SmartContract,
    bsv,
    ContractTransaction,
    toByteString,
    sha256,
} from 'scrypt-ts'
import { Counter } from '../../src/contracts/counter'
import { getDummySigner, getDummyUTXO } from '../utils/helper'
import { expect } from 'chai'
import { HashPuzzle } from '../../src/contracts/hashPuzzle'

describe('Test SmartContract `Counter, HashPuzzle` multi call on local', () => {
    before(async () => {
        await Counter.compile()
        await HashPuzzle.compile()
    })

    it('should succeed', async () => {
        const signer = getDummySigner()
        let counter1 = new Counter(1n)

        // connect to a signer
        await counter1.connect(signer)

        counter1.bindTxBuilder(
            'incrementOnChain',
            (
                current: Counter,
                options: MethodCallOptions<Counter>,
                ...args: any
            ): Promise<ContractTransaction> => {
                // create the next instance from the current
                const nextInstance = current.next()
                // apply updates on the next instance locally
                nextInstance.count++

                const tx = new bsv.Transaction()
                tx.addInput(
                    current.buildContractInput(options.fromUTXO)
                ).addOutput(
                    new bsv.Transaction.Output({
                        script: nextInstance.lockingScript,
                        satoshis: current.balance,
                    })
                )

                return Promise.resolve({
                    tx: tx,
                    atInputIndex: 0,
                    nexts: [
                        {
                            instance: nextInstance,
                            balance: current.balance,
                            atOutputIndex: 0,
                        },
                    ],
                })
            }
        )

        const plainText = 'abc'
        const byteString = toByteString(plainText, true)
        const sha256Data = sha256(byteString)

        const hashPuzzle = new HashPuzzle(sha256Data)

        // connect to a signer
        await hashPuzzle.connect(signer)
        hashPuzzle.bindTxBuilder(
            'unlock',
            (
                current: HashPuzzle,
                options: MethodCallOptions<HashPuzzle>,
                ...args: any
            ): Promise<ContractTransaction> => {
                if (options.partialContractTx) {
                    const unSignedTx = options.partialContractTx.tx
                    unSignedTx.addInput(
                        current.buildContractInput(options.fromUTXO)
                    )

                    return Promise.resolve({
                        tx: unSignedTx,
                        atInputIndex: 1,
                        nexts: [],
                    })
                }

                throw new Error('no partialContractTx found')
            }
        )

        const partialTx = await counter1.methods.incrementOnChain({
            multiContractCall: true,
            fromUTXO: getDummyUTXO(1, true),
        } as MethodCallOptions<Counter>)

        const finalTx = await hashPuzzle.methods.unlock(byteString, {
            fromUTXO: getDummyUTXO(1, true),
            multiContractCall: true,
            partialContractTx: partialTx,
        } as MethodCallOptions<HashPuzzle>)

        const { tx: callTx, nexts } = await SmartContract.multiContractCall(
            finalTx,
            signer
        )

        const result = callTx.verify()
        expect(result).to.be.true

        // hashPuzzle has terminated, but counter can still be called
        counter1 = nexts[0].instance
    })
})
