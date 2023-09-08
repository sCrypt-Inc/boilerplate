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
    Ordinal,
} from 'scrypt-ts'
import { P2PKH } from '../src/contracts/p2pkh'
import { getDefaultSigner } from './utils/helper'
import { myPublicKey, myPublicKeyHash } from './utils/privateKey'
import { fetchBSV20Utxo, sendBSV20ToContract } from './utils/ord'

use(chaiAsPromised)

describe('Test SmartContract `P2PKH`', () => {
    const ordPk = bsv.PrivateKey.fromWIF(process.env.ORD_KEY || '')
    const ordAddr = ordPk.toAddress().toString()
    console.log('ordAddr', ordAddr)
    before(async () => {
        await P2PKH.compile()
    })

    it('should pass if using right private key', async () => {
        const ordinalUtxos = await fetchBSV20Utxo(ordAddr, 'LUNC')

        console.log('ordinalUtxos', ordinalUtxos)

        if (ordinalUtxos.length === 0) {
            return
        }

        // create a new P2PKH contract instance
        const p2pkh = new P2PKH(PubKeyHash(toHex(myPublicKeyHash)))

        await p2pkh.connect(getDefaultSigner())

        const tx = await sendBSV20ToContract(ordinalUtxos[0], ordPk, p2pkh)

        console.log('sendBSV20ToContract', tx.id)

        // call public function `unlock` of this contract

        p2pkh.bindTxBuilder(
            'unlock',
            (
                current: P2PKH,
                options: MethodCallOptions<P2PKH>,
                ...args: any
            ) => {
                const p = Utils.buildPublicKeyHashScript(
                    hash160(toHex(ordPk.publicKey))
                )

                const ord = current.getOrdinal() as Ordinal

                const unsignedTx: bsv.Transaction = new bsv.Transaction()
                    // add contract input
                    .addInput(current.buildContractInput())
                    // add a p2pkh output
                    .addOutput(
                        new bsv.Transaction.Output({
                            script: ord.toP2PKH(ordPk.publicKey),
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
            const changeAddress = await p2pkh.signer.getDefaultAddress()
            try {
                const { tx } = await p2pkh.methods.unlock(
                    (sigResps) => findSig(sigResps, myPublicKey),
                    // pass public key, the second parameter, to `unlock`
                    PubKey(toHex(myPublicKey)),
                    // method call options
                    {
                        verify: true,
                        pubKeyOrAddrToSign: myPublicKey,
                        changeAddress,
                    } as MethodCallOptions<P2PKH>
                )

                console.log('callTx:', tx.id)
            } catch (error) {
                console.log('aa', error)
            }
        }
        return expect(callContract()).not.rejected
    })
})
