import { expect, use } from 'chai'
import chaiAsPromised from 'chai-as-promised'
import { MethodCallOptions, toHex, bsv, hash160, Ordinal } from 'scrypt-ts'
import { Bsv20Counter } from '../src/contracts/bsv20Counter'
import { getDefaultSigner } from './utils/helper'
import { fetchBSV20Utxo, sendBSV20ToContract } from './utils/ord'

use(chaiAsPromised)

describe('Test SmartContract `Bsv20Counter`', () => {
    const ordPk = bsv.PrivateKey.fromWIF(process.env.ORD_KEY || '')
    const ordAddr = ordPk.toAddress().toString()
    const ordPKH = hash160(toHex(ordPk.publicKey))
    console.log('ordAddr', ordAddr)
    before(async () => {
        await Bsv20Counter.compile()
    })

    it('should pass if using right private key', async () => {
        const ordinalUtxos = await fetchBSV20Utxo(ordAddr, 'LUNC')

        console.log('ordinalUtxos', ordinalUtxos)

        const ordinal = Ordinal.fromScript(
            bsv.Script.fromHex(ordinalUtxos[0].script)
        ) as Ordinal

        // create a new CounterOrd contract instance
        const counter = new Bsv20Counter(0n, ordinal.size())

        await counter.connect(getDefaultSigner())

        const tx = await sendBSV20ToContract(ordinalUtxos[0], ordPk, counter)

        console.log('sendBSV20ToContract', tx.id)

        // call public function `unlock` of this contract

        let currentInstance = counter

        // call the method of current instance to apply the updates on chain
        for (let i = 0; i < 3; ++i) {
            // create the next instance from the current
            const nextInstance = currentInstance.next()

            const ordinal = currentInstance.getOrdinal()

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
                } as MethodCallOptions<Bsv20Counter>)
                console.log('callTx:', tx.id)
            }

            await expect(callContract()).not.rejected

            // update the current instance reference
            currentInstance = nextInstance
        }

        currentInstance.bindTxBuilder(
            'withdraw',
            (
                current: Bsv20Counter,
                options: MethodCallOptions<Bsv20Counter>,
                ...args: any
            ) => {
                const unsignedTx: bsv.Transaction = new bsv.Transaction()
                    // add contract input
                    .addInput(current.buildContractInput())
                    // add a p2pkh output
                    .addOutput(
                        new bsv.Transaction.Output({
                            script: ordinal.toP2PKH(ordPk.publicKey),
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
                } as MethodCallOptions<Bsv20Counter>
            )

            console.log('callTx:', tx.id)
        }
        return expect(callContract()).not.rejected
    })
})
