import {
    MethodCallOptions,
    SmartContract,
    bsv,
    ContractTransaction,
    toByteString,
    sha256,
} from 'scrypt-ts'
import { AdvancedCounter } from '../../src/contracts/advancedCounter'
import { getDefaultSigner } from '../utils/helper'
import { HashPuzzle } from '../../src/contracts/hashPuzzle'

async function main() {
    await AdvancedCounter.compile()
    await HashPuzzle.compile()

    const signer = getDefaultSigner()
    let counter = new AdvancedCounter(1n)

    // connect to a signer
    await counter.connect(signer)

    // contract deployment
    const deployTx = await counter.deploy(1)
    console.log('AdvancedCounter contract deployed: ', deployTx.id)

    counter.bindTxBuilder(
        'incrementOnChain',
        (
            current: AdvancedCounter,
            options: MethodCallOptions<AdvancedCounter>,
            ...args: any
        ): Promise<ContractTransaction> => {
            // create the next instance from the current
            const nextInstance = current.next()
            // apply updates on the next instance locally
            nextInstance.count++

            const tx = new bsv.Transaction()
            tx.addInput(current.buildContractInput(options.fromUTXO)).addOutput(
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

    const deployTx1 = await hashPuzzle.deploy(1)
    console.log('HashPuzzle contract deployed: ', deployTx1.id)

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

    const partialTx = await counter.methods.incrementOnChain({
        multiContractCall: true,
    } as MethodCallOptions<AdvancedCounter>)

    const finalTx = await hashPuzzle.methods.unlock(byteString, {
        multiContractCall: true,
        partialContractTx: partialTx,
    } as MethodCallOptions<HashPuzzle>)

    const { tx: callTx, nexts } = await SmartContract.multiContractCall(
        finalTx,
        signer
    )

    console.log(
        'AdvancedCounter, HashPuzzle contract `unlock` called: ',
        callTx.id
    )

    // hashPuzzle has terminated, but counter can still be called
    counter = nexts[0].instance
}

describe('Test SmartContract `AdvancedCounter, HashPuzzle ` multi called on testnet', () => {
    it('should succeed', async () => {
        await main()
    })
})
