import { VirtualUTXO } from '../../src/contracts/virtualUTXO'
import { bsv, MethodCallOptions, SmartContract, StatefulNext } from 'scrypt-ts'
import { expect } from 'chai'
import { getDummySigner } from '../utils/helper'
import { randomBytes } from 'crypto'

describe('Test SmartContract `VirtualUTXO`', () => {
    let instance0: VirtualUTXO
    let instance1: VirtualUTXO
    let instance2: VirtualUTXO

    before(async () => {
        await VirtualUTXO.compile()

        instance0 = new VirtualUTXO()
        instance1 = new VirtualUTXO()
        instance2 = new VirtualUTXO()

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
            (current: VirtualUTXO, options: MethodCallOptions<VirtualUTXO>) => {
                const next = options.next as StatefulNext<VirtualUTXO>

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
        } as MethodCallOptions<VirtualUTXO>)

        instance1.bindTxBuilder(
            'unlock',
            (current: VirtualUTXO, options: MethodCallOptions<VirtualUTXO>) => {
                const next = options.next as StatefulNext<VirtualUTXO>

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
        } as MethodCallOptions<VirtualUTXO>)

        instance2.bindTxBuilder(
            'unlock',
            (current: VirtualUTXO, options: MethodCallOptions<VirtualUTXO>) => {
                const next = options.next as StatefulNext<VirtualUTXO>

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

                    if (options.changeAddress) {
                        unSignedTx.change(options.changeAddress)
                    }

                    return Promise.resolve({
                        tx: unSignedTx,
                        atInputIndex: 2,
                        nexts: [next],
                    })
                }

                throw new Error('no partialContractTx found')
            }
        )

        const changeAddress = await instance2.signer.getDefaultAddress()
        contractTx = await instance2.methods.unlock({
            fromUTXO: fromUTXO_2,
            multiContractCall: true,
            partialContractTx: contractTx,
            next: {
                instance: instance1.next(),
                balance: 1,
                atOutputIndex: 2,
            },
        } as MethodCallOptions<VirtualUTXO>)

        const { tx: callTx, nexts } = await SmartContract.multiContractCall(
            contractTx,
            getDummySigner()
        )

        const result = callTx.verify()
        expect(result).to.be.true
    })
})
