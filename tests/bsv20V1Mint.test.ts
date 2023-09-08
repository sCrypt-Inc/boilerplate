import { expect, use } from 'chai'
import { Bsv20V1Mint } from '../src/contracts/bsv20V1Mint'
import { getDefaultSigner } from './utils/helper'
import {
    MethodCallOptions,
    Ordinal,
    bsv,
    hash160,
    toByteString,
    toHex,
} from 'scrypt-ts'
import chaiAsPromised from 'chai-as-promised'
use(chaiAsPromised)
describe('Test SmartContract `Bsv20V1Mint`', () => {
    const ordPk = bsv.PrivateKey.fromWIF(process.env.ORD_KEY || '')
    const ordAddr = ordPk.toAddress().toString()
    console.log('ordAddr', ordAddr)
    const ordPKH = hash160(toHex(ordPk.publicKey))

    const TICK = 'F111'

    const totalSupply = 21000000n

    let latestTx: bsv.Transaction

    before(async () => {
        await Bsv20V1Mint.compile()
    })

    it('mint all token once time.', async () => {
        const bsv20V1Mint = new Bsv20V1Mint(
            toByteString(TICK, true),
            totalSupply
        )

        await bsv20V1Mint.connect(getDefaultSigner())

        const mintOrdianl = Ordinal.createMintBsv20(
            TICK,
            totalSupply.toString()
        )
        bsv20V1Mint.setOrdinal(mintOrdianl)

        latestTx = await bsv20V1Mint.deploy(1)
        console.log('deploytx', latestTx.id)
    })

    it('should transfer 100 token successfully.', async () => {
        //const bsv20V1Mint = new Bsv20V1Mint(toByteString(TICK, true), 21000000n)
        const bsv20V1Mint = Bsv20V1Mint.fromTx(latestTx, 0)

        await bsv20V1Mint.connect(getDefaultSigner())

        // create the next instance from the current

        const transferAmt = 100n
        const nextInstance = bsv20V1Mint.next()
        nextInstance.totalMinted += transferAmt

        const transferOrdianl = Ordinal.createTransferBsv20(
            TICK,
            nextInstance.remainingAmt().toString()
        )

        nextInstance.setOrdinal(transferOrdianl)

        // call the method of current instance to apply the updates on chain
        const callContract = async () => {
            bsv20V1Mint.bindTxBuilder(
                'mint',
                async (
                    current: Bsv20V1Mint,
                    options: MethodCallOptions<Bsv20V1Mint>,
                    ...args: any
                ) => {
                    const changeAddress =
                        await current.signer.getDefaultAddress()

                    const ord = Ordinal.createTransferBsv20(
                        TICK,
                        transferAmt.toString()
                    )

                    const unsignedTx: bsv.Transaction = new bsv.Transaction()
                        // add contract input
                        .addInput(current.buildContractInput())
                        // add a p2pkh output
                        .addOutput(
                            new bsv.Transaction.Output({
                                script: nextInstance.lockingScript,
                                satoshis: 1,
                            })
                        )
                        .addOutput(
                            new bsv.Transaction.Output({
                                script: ord.toP2PKH(ordAddr),
                                satoshis: 1,
                            })
                        )
                        .change(changeAddress)

                    return Promise.resolve({
                        tx: unsignedTx,
                        atInputIndex: 0, // the contract input's index
                        nexts: [
                            {
                                instance: nextInstance,
                                balance: 1,
                                atOutputIndex: 1,
                            },
                        ],
                    })
                }
            )

            const ordinal = bsv20V1Mint.getOrdinal() as Ordinal

            const { tx } = await bsv20V1Mint.methods.mint(
                ordPKH,
                toByteString(transferAmt.toString(), true),
                ordinal.size()
            )

            console.log('call tx: ', tx.id)
        }

        await expect(callContract()).not.rejected
    })
})
