import { VirtualUTXO } from '../src/contracts/virtualUTXO'
import { bsv, MethodCallOptions, SmartContract, StatefulNext } from 'scrypt-ts'
import { expect } from 'chai'
import { getDefaultSigner } from './utils/helper'

describe('Test SmartContract `VirtualUTXO`', () => {
    let instance0: VirtualUTXO
    let instance1: VirtualUTXO
    let instance2: VirtualUTXO

    before(async () => {
        VirtualUTXO.loadArtifact()

        instance0 = new VirtualUTXO()

        await instance0.connect(getDefaultSigner())
    })

    it('should pass unlock', async () => {
        const deployTx = await instance0.deploy(1)
        console.log('VirtualUTXO contract deployed: ', deployTx.id)

        instance1 = VirtualUTXO.fromTx(deployTx, 1)
        await instance1.connect(getDefaultSigner())
        instance2 = VirtualUTXO.fromTx(deployTx, 2)
        await instance2.connect(getDefaultSigner())

        instance0.bindTxBuilder(
            'unlock',
            (current: VirtualUTXO, options: MethodCallOptions<VirtualUTXO>) => {
                const next = options.next as StatefulNext<VirtualUTXO>

                const unsignedTx: bsv.Transaction = new bsv.Transaction()
                    .addInput(current.buildContractInput())
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
            multiContractCall: true,
            next: {
                instance: instance0.next(),
                balance: instance0.balance,
                atOutputIndex: 0,
            },
        } as MethodCallOptions<VirtualUTXO>)

        instance1.bindTxBuilder(
            'unlock',
            (current: VirtualUTXO, options: MethodCallOptions<VirtualUTXO>) => {
                const next = options.next as StatefulNext<VirtualUTXO>

                if (options.partialContractTx) {
                    const unSignedTx = options.partialContractTx.tx
                    unSignedTx.addInput(current.buildContractInput()).addOutput(
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
            multiContractCall: true,
            partialContractTx: contractTx,
            next: {
                instance: instance1.next(),
                balance: instance1.balance,
                atOutputIndex: 1,
            },
        } as MethodCallOptions<VirtualUTXO>)

        instance2.bindTxBuilder(
            'unlock',
            (current: VirtualUTXO, options: MethodCallOptions<VirtualUTXO>) => {
                const next = options.next as StatefulNext<VirtualUTXO>

                if (options.partialContractTx) {
                    const unSignedTx = options.partialContractTx.tx
                    unSignedTx.addInput(current.buildContractInput()).addOutput(
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

        contractTx = await instance2.methods.unlock({
            multiContractCall: true,
            partialContractTx: contractTx,
            next: {
                instance: instance2.next(),
                balance: instance2.balance,
                atOutputIndex: 2,
            },
        } as MethodCallOptions<VirtualUTXO>)

        const callContract = async () =>
            SmartContract.multiContractCall(contractTx, getDefaultSigner())
        return expect(callContract()).not.rejected
    })
})
