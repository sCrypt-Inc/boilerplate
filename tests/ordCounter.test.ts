import { expect, use } from 'chai'
import chaiAsPromised from 'chai-as-promised'
import { MethodCallOptions, toHex, bsv, hash160 } from 'scrypt-ts'
import { OrdCounter } from '../src/contracts/ordCounter'
import { getDefaultSigner } from './utils/helper'
import { Ordinal } from '../src/contracts/ordinalLib'

use(chaiAsPromised)

describe('Test SmartContract `OrdCounter`', () => {
    const ordPk = bsv.PrivateKey.fromWIF(process.env.ORD_KEY || '')
    const ordAddr = ordPk.toAddress().toString()
    const ordPKH = hash160(toHex(ordPk.publicKey))
    console.log('ordAddr', ordAddr)

    let counter: OrdCounter
    let currentInstance: OrdCounter
    const ordinal = Ordinal.createText('hello, sCrypt!')

    before(async () => {
        await OrdCounter.compile()
    })

    it('mint ordinal nft', async () => {
        // create a new CounterOrd contract instance
        counter = new OrdCounter(0n)

        await counter.connect(getDefaultSigner())

        const aa = ordinal.toScript()
        counter.setNOPScript(ordinal.toScript())

        const deploy = async () => {
            const deployTx = await counter.deploy(1)

            console.log('ordinal deployed: ', deployTx.id)
        }
        return expect(deploy()).not.rejected
    })

    it('transfer ordinal nft', async () => {
        // call public function `unlock` of this contract
        currentInstance = counter

        // call the method of current instance to apply the updates on chain
        for (let i = 0; i < 3; ++i) {
            // create the next instance from the current
            const nextInstance = currentInstance.next()

            // apply updates on the next instance off chain
            nextInstance.increment()

            // call the method of current instance to apply the updates on chain
            const callContract = async () => {
                const { tx } = await currentInstance.methods.incrementOnChain({
                    verify: true,
                    next: {
                        instance: nextInstance,
                        balance: 1,
                    },
                } as MethodCallOptions<OrdCounter>)
                console.log('callTx:', tx.id)
            }

            await expect(callContract()).not.rejected

            // update the current instance reference
            currentInstance = nextInstance
        }
    })

    it('withdraw ordinal nft', async () => {
        currentInstance.bindTxBuilder(
            'withdraw',
            (
                current: OrdCounter,
                options: MethodCallOptions<OrdCounter>,
                ...args: any
            ) => {
                const unsignedTx: bsv.Transaction = new bsv.Transaction()
                    // add contract input
                    .addInput(current.buildContractInput())
                    // add a p2pkh output
                    .addOutput(
                        new bsv.Transaction.Output({
                            script: bsv.Script.buildPublicKeyHashOut(
                                ordPk.publicKey
                            ),
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

        const callWithdraw = async () => {
            const changeAddress =
                await currentInstance.signer.getDefaultAddress()
            const { tx } = await currentInstance.methods.withdraw(
                ordPKH,
                // method call options
                {
                    verify: true,
                    changeAddress,
                } as MethodCallOptions<OrdCounter>
            )

            console.log('callTx:', tx.id)
        }
        return expect(callWithdraw()).not.rejected
    })
})
