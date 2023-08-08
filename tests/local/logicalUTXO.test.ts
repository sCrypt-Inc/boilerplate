import { LogicalUTXO } from '../../src/contracts/logicalUTXO'
import {
    bsv,
    findSig,
    hash160,
    MethodCallOptions,
    PubKey,
    SmartContract,
    StatefulNext,
    toHex,
    Utils,
} from 'scrypt-ts'
import { expect } from 'chai'
import { getDummySigner, getDummyUTXO } from '../utils/helper'
import { randomBytes } from 'crypto'

describe('Test SmartContract `LogicalUTXO`', () => {
    let instance0: LogicalUTXO
    let instance1: LogicalUTXO
    let instance2: LogicalUTXO

    before(async () => {
        await LogicalUTXO.compile()

        instance0 = new LogicalUTXO()
        instance1 = new LogicalUTXO()
        instance2 = new LogicalUTXO()

        await instance0.connect(getDummySigner())
        await instance1.connect(getDummySigner())
        await instance2.connect(getDummySigner())
    })

    it('should pass unlock', async () => {
        const fromTXID = randomBytes(32).toString('hex')
        const fromUTXO_0 = {
            txId: fromTXID,
            outputIndex: 0,
            script: '', // placeholder
            satoshis: 1,
        }
        const fromUTXO_1 = {
            txId: fromTXID,
            outputIndex: 1,
            script: '', // placeholder
            satoshis: 1,
        }
        const fromUTXO_2 = {
            txId: fromTXID,
            outputIndex: 2,
            script: '', // placeholder
            satoshis: 1,
        }

        instance0.bindTxBuilder(
            'unlock',
            (current: LogicalUTXO, options: MethodCallOptions<LogicalUTXO>) => {
                const next = options.next as StatefulNext<LogicalUTXO>

                const unsignedTx: bsv.Transaction = new bsv.Transaction()
                    .addInput(current.buildContractInput(options.fromUTXO))
                    // add contract output
                    .addOutput(
                        new bsv.Transaction.Output({
                            script: next.instance.lockingScript,
                            satoshis: current.balance,
                        })
                    )

                return Promise.resolve({
                    tx: unsignedTx,
                    atInputIndex: 0,
                    nexts: [next],
                })
            }
        )

        let contractTx = await instance0.methods.unlock({
            fromUTXO: fromUTXO_0,
            multiContractCall: true,
            next: {
                instance: instance0.next(),
                balance: 1,
                atOutputIndex: 0,
            },
        } as MethodCallOptions<LogicalUTXO>)

        instance1.bindTxBuilder(
            'unlock',
            (current: LogicalUTXO, options: MethodCallOptions<LogicalUTXO>) => {
                const next = options.next as StatefulNext<LogicalUTXO>

                if (options.partialContractTx) {
                    const unSignedTx = options.partialContractTx.tx
                    unSignedTx
                        .addInput(current.buildContractInput(options.fromUTXO))
                        .addOutput(
                            new bsv.Transaction.Output({
                                script: next.instance.lockingScript,
                                satoshis: current.balance,
                            })
                        )

                    return Promise.resolve({
                        tx: unSignedTx,
                        atInputIndex: 1,
                        nexts: [next],
                    })
                }

                throw new Error('no partialContractTx found')
            }
        )

        contractTx = await instance1.methods.unlock({
            fromUTXO: fromUTXO_1,
            multiContractCall: true,
            partialContractTx: contractTx,
            next: {
                instance: instance1.next(),
                balance: 1,
                atOutputIndex: 1,
            },
        } as MethodCallOptions<LogicalUTXO>)

        instance2.bindTxBuilder(
            'unlock',
            (current: LogicalUTXO, options: MethodCallOptions<LogicalUTXO>) => {
                const next = options.next as StatefulNext<LogicalUTXO>

                if (options.partialContractTx) {
                    const unSignedTx = options.partialContractTx.tx
                    unSignedTx
                        .addInput(current.buildContractInput(options.fromUTXO))
                        .addOutput(
                            new bsv.Transaction.Output({
                                script: next.instance.lockingScript,
                                satoshis: current.balance,
                            })
                        )

                    return Promise.resolve({
                        tx: unSignedTx,
                        atInputIndex: 2,
                        nexts: [next],
                    })
                }

                throw new Error('no partialContractTx found')
            }
        )

        contractTx = await instance2.methods.unlock({
            fromUTXO: fromUTXO_2,
            multiContractCall: true,
            partialContractTx: contractTx,
            next: {
                instance: instance1.next(),
                balance: 1,
                atOutputIndex: 2,
            },
        } as MethodCallOptions<LogicalUTXO>)

        const { tx: callTx, nexts } = await SmartContract.multiContractCall(
            contractTx,
            getDummySigner()
        )

        const result = callTx.verify()
        expect(result).to.be.true
    })
})
