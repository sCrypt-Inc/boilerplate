import { expect, use } from 'chai'
import chaiAsPromised from 'chai-as-promised'
import {
    findSig,
    MethodCallOptions,
    PubKey,
    PubKeyHash,
    toHex,
    bsv,
    Utils,
    hash160,
    sizeOfOrdinal,
} from 'scrypt-ts'
import { CounterOrd } from '../src/contracts/counterOrd'
import { getDefaultSigner } from './utils/helper'
import { fetchBSV20Utxo, sendBSV20ToContract } from './utils/ord'

use(chaiAsPromised)

describe('Test SmartContract `CounterOrd`', () => {
    const ordPk = bsv.PrivateKey.fromWIF('')
    const ordAddr = ordPk.toAddress().toString()
    const ordPKH = hash160(toHex(ordPk.publicKey))
    console.log('ordAddr', ordAddr)
    before(async () => {
        await CounterOrd.compile()
    })

    it('should pass if using right private key', async () => {
        const ordinalUtxos = await fetchBSV20Utxo(ordAddr, 'LUNC')

        console.log('ordinalUtxos', ordinalUtxos)

        const ordinal = bsv.Script.fromHex(ordinalUtxos[0].script.slice(50))

        const inscriptLen = BigInt(ordinal.toHex().length / 2)

        // create a new CounterOrd contract instance
        const counter = new CounterOrd(0n, inscriptLen)

        await counter.connect(getDefaultSigner())

        const tx = await sendBSV20ToContract(ordinalUtxos[0], ordPk, counter)

        console.log('sendBSV20ToContract', tx.id)

        // call public function `unlock` of this contract

        let currentInstance = counter

        // call the method of current instance to apply the updates on chain
        for (let i = 0; i < 3; ++i) {
            // create the next instance from the current
            const nextInstance = currentInstance.next()

            nextInstance.setOrdinal(ordinal)
            // apply updates on the next instance off chain
            nextInstance.increment()

            // call the method of current instance to apply the updates on chain
            const callContract = async () => {
                const { tx } = await currentInstance.methods.incrementOnChain({
                    next: {
                        instance: nextInstance,
                        balance: 1,
                    },
                } as MethodCallOptions<CounterOrd>)
                console.log('callTx:', tx.id)
            }

            await expect(callContract()).not.rejected

            // update the current instance reference
            currentInstance = nextInstance
        }

        currentInstance.bindTxBuilder(
            'withdraw',
            (
                current: CounterOrd,
                options: MethodCallOptions<CounterOrd>,
                ...args: any
            ) => {
                const p = Utils.buildPublicKeyHashScript(ordPKH)

                const ord = ordinal.toHex()

                const ordP2PKH = p + ord
                const unsignedTx: bsv.Transaction = new bsv.Transaction()
                    // add contract input
                    .addInput(current.buildContractInput())
                    // add a p2pkh output
                    .addOutput(
                        new bsv.Transaction.Output({
                            script: bsv.Script.fromHex(ordP2PKH),
                            satoshis: 1,
                        })
                    )
                // add change output
                if (options.changeAddress) {
                    unsignedTx.change(options.changeAddress)
                }

                return Promise.resolve({
                    tx: unsignedTx,
                    atInputIndex: 0, // the contract input's index
                    nexts: [],
                })
            }
        )

        const callContract = async () => {
            const changeAddress =
                await currentInstance.signer.getDefaultAddress()
            const { tx } = await currentInstance.methods.withdraw(
                ordPKH,
                // method call options
                {
                    verify: true,
                    changeAddress,
                } as MethodCallOptions<CounterOrd>
            )

            console.log('callTx:', tx.id)
        }
        return expect(callContract()).not.rejected
    })
})
