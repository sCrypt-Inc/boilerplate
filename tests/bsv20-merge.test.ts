import { expect, use } from 'chai'
import chaiAsPromised from 'chai-as-promised'
import {
    findSig,
    MethodCallOptions,
    PubKey,
    toHex,
    bsv,
    ContractTransaction,
    SmartContract,
    PubKeyHash,
} from 'scrypt-ts'
import { P2PKH } from '../src/contracts/p2pkh'
import { getDefaultSigner } from './utils/helper'
import { myPublicKey, myPublicKeyHash } from './utils/privateKey'
import { Ordinal } from './utils/ordinal'

use(chaiAsPromised)

describe('Test SmartContract `P2PKH`', () => {
    const ordPk = bsv.PrivateKey.fromWIF(process.env.ORD_KEY || '')
    const ordAddr = ordPk.toAddress().toString()
    console.log('ordAddr', ordAddr)
    before(async () => {
        await P2PKH.compile()
    })

    function merge(p2pkh1: P2PKH, p2pkh2: P2PKH) {
        // call public function `unlock` of this contract

        const ord1 = Ordinal.fromScript(
            p2pkh1.getNOPScript() as bsv.Script
        ) as Ordinal

        const ord2 = Ordinal.fromScript(
            p2pkh2.getNOPScript() as bsv.Script
        ) as Ordinal

        const ordJson1 = JSON.parse(ord1.getInscription().content)

        const ordJson2 = JSON.parse(ord2.getInscription().content)

        const total = BigInt(ordJson1.amt) + BigInt(ordJson2.amt)

        const merged = Ordinal.createTransferBsv20(
            ordJson1.tick,
            total.toString()
        )

        p2pkh1.bindTxBuilder(
            'unlock',
            (
                current: P2PKH,
                options: MethodCallOptions<P2PKH>,
                ...args: any
            ) => {
                const unsignedTx: bsv.Transaction = new bsv.Transaction()
                    // add contract input
                    .addInput(current.buildContractInput())
                    // add a p2pkh output
                    .addOutput(
                        new bsv.Transaction.Output({
                            script: merged.toP2PKH(ordPk.publicKey),
                            satoshis: 1,
                        })
                    )

                return Promise.resolve({
                    tx: unsignedTx,
                    atInputIndex: 0, // the contract input's index
                    nexts: [],
                })
            }
        )

        p2pkh2.bindTxBuilder(
            'unlock',
            async (
                current: P2PKH,
                options: MethodCallOptions<P2PKH>,
                ...args: any
            ): Promise<ContractTransaction> => {
                if (options.partialContractTx) {
                    const changeAddress =
                        await current.signer.getDefaultAddress()

                    options.partialContractTx.tx
                        .addInput(current.buildContractInput())
                        .change(changeAddress)

                    return Promise.resolve({
                        tx: options.partialContractTx.tx,
                        nexts: [],
                        atInputIndex: 1,
                    })
                }

                throw new Error('no partialContractTx')
            }
        )

        const callContract = async () => {
            try {
                const partialContractTx = await p2pkh1.methods.unlock(
                    (sigResps) => findSig(sigResps, myPublicKey),
                    // pass public key, the second parameter, to `unlock`
                    PubKey(toHex(myPublicKey)),
                    // method call options
                    {
                        pubKeyOrAddrToSign: myPublicKey,
                        multiContractCall: true,
                    } as MethodCallOptions<P2PKH>
                )

                const partialContractTx1 = await p2pkh2.methods.unlock(
                    (sigResps) => findSig(sigResps, myPublicKey),
                    PubKey(toHex(myPublicKey)),
                    // method call options
                    {
                        pubKeyOrAddrToSign: myPublicKey,
                        multiContractCall: true,
                        partialContractTx,
                    } as MethodCallOptions<P2PKH>
                )

                const callTx = await SmartContract.multiContractCall(
                    partialContractTx1,
                    getDefaultSigner()
                )
                console.log('callTx:', callTx.tx.id)
            } catch (error) {
                console.log('aa', error)
            }
        }
    }

    it('should pass if using right private key', async () => {
        const ordinalUtxos = await Ordinal.fetchBSV20Utxo(ordAddr, 'LUNC')

        console.log('ordinalUtxos', ordinalUtxos)

        if (ordinalUtxos.length === 0) {
            return
        }

        // create a new P2PKH contract instance
        const p2pkh1 = new P2PKH(PubKeyHash(toHex(myPublicKeyHash)))

        await p2pkh1.connect(getDefaultSigner())

        const tx1 = await Ordinal.send2Contract(ordinalUtxos[0], ordPk, p2pkh1)

        console.log('sendBSV20ToContract', tx1.id)

        const p2pkh2 = new P2PKH(PubKeyHash(toHex(myPublicKeyHash)))

        await p2pkh2.connect(getDefaultSigner())

        const tx2 = await Ordinal.send2Contract(ordinalUtxos[1], ordPk, p2pkh1)

        console.log('sendBSV20ToContract', tx2.id)

        return expect(merge(p2pkh1, p2pkh2)).not.rejected
    })

    it('should pass if using right private key', async () => {
        const signer = getDefaultSigner()

        await signer.provider?.connect()

        const tx1 = (await signer.provider?.getTransaction(
            '2abbb9c6b7ace3b7820bef58503f8588c69e7ead2c8235287df5b11ab9bd6bba'
        )) as bsv.Transaction
        const tx2 = (await signer.provider?.getTransaction(
            '1623d506108bc8c15fdc91c3f8bb197ff65a5f3e8a961c86690f6274c67034f5'
        )) as bsv.Transaction

        const p2pkh1 = P2PKH.fromTx(tx1, 0)

        await p2pkh1.connect(signer)

        const p2pkh2 = P2PKH.fromTx(tx2, 0)

        await p2pkh2.connect(signer)

        return expect(merge(p2pkh1, p2pkh2)).not.rejected
    })
})
