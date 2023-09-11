import { expect, use } from 'chai'
import chaiAsPromised from 'chai-as-promised'
import {
    findSig,
    MethodCallOptions,
    PubKey,
    PubKeyHash,
    toHex,
    bsv,
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

    it('should pass if using right private key', async () => {
        const ordinalUtxos = await Ordinal.fetchBSV20Utxo(ordAddr, 'MLGB')

        console.log('ordinalUtxos', ordinalUtxos)

        if (ordinalUtxos.length === 0) {
            return
        }

        // create a new P2PKH contract instance
        const p2pkh = new P2PKH(PubKeyHash(toHex(myPublicKeyHash)))

        await p2pkh.connect(getDefaultSigner())

        const tx = await Ordinal.send2Contract(
            ordinalUtxos[0],
            ordPk,
            p2pkh,
            true
        )

        console.log('send2Contract', tx.id)

        // call public function `unlock` of this contract

        p2pkh.bindTxBuilder(
            'unlock',
            async (
                current: P2PKH,
                options: MethodCallOptions<P2PKH>,
                ...args: any
            ) => {
                const changeAddress = await current.signer.getDefaultAddress()
                const ord = Ordinal.fromScript(
                    current.getNOPScript() as bsv.Script
                ) as Ordinal

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
                if (changeAddress) {
                    unsignedTx.change(changeAddress)
                }

                return Promise.resolve({
                    tx: unsignedTx,
                    atInputIndex: 0, // the contract input's index
                    nexts: [],
                })
            }
        )

        const callContract = async () => {
            const { tx } = await p2pkh.methods.unlock(
                (sigResps) => findSig(sigResps, myPublicKey),
                // pass public key, the second parameter, to `unlock`
                PubKey(toHex(myPublicKey)),
                // method call options
                {
                    verify: true,
                    pubKeyOrAddrToSign: myPublicKey,
                } as MethodCallOptions<P2PKH>
            )

            console.log('callTx:', tx.id)
        }
        return expect(callContract()).not.rejected
    })
})
