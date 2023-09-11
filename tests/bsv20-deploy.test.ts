import { expect, use } from 'chai'
import chaiAsPromised from 'chai-as-promised'
import {
    findSig,
    MethodCallOptions,
    PubKey,
    PubKeyHash,
    toHex,
    bsv,
    hash160,
} from 'scrypt-ts'
import { P2PKH } from '../src/contracts/p2pkh'
import { getDefaultSigner } from './utils/helper'
import { myPublicKey, myPublicKeyHash } from './utils/privateKey'
import { Ordinal } from './utils/ordinal'
use(chaiAsPromised)

describe('Test SmartContract `P2PKH`', () => {
    const ordPk = bsv.PrivateKey.fromWIF(process.env.ORD_KEY || '')
    const ordAddr = ordPk.toAddress().toString()
    const ordPKH = hash160(toHex(ordPk.publicKey))
    console.log('ordAddr', ordAddr)
    const TICK = 'XXXX'
    before(async () => {
        await P2PKH.compile()
    })

    it('DeployBsv20', async () => {
        // create a new P2PKH contract instance
        const p2pkh = new P2PKH(PubKeyHash(toHex(myPublicKeyHash)))

        await p2pkh.connect(getDefaultSigner())

        p2pkh.setNOPScript(
            Ordinal.createDeployBsv20(TICK, '10000', '10000').toScript()
        )

        const deployTx = await p2pkh.deploy(1)
        console.log('deployTx:', deployTx.id)
    })

    it('Mint, transfer Bsv20', async () => {
        // create a new P2PKH contract instance
        const p2pkh = new P2PKH(PubKeyHash(toHex(myPublicKeyHash)))

        await p2pkh.connect(getDefaultSigner())

        p2pkh.setNOPScript(Ordinal.createMintBsv20(TICK, '10000').toScript())

        const deployTx = await p2pkh.deploy(1)
        console.log('deployTx:', deployTx.id)

        p2pkh.bindTxBuilder(
            'unlock',
            (
                current: P2PKH,
                options: MethodCallOptions<P2PKH>,
                ...args: any
            ) => {
                const ordinal = Ordinal.createTransferBsv20(TICK, '100')

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
            const changeAddress = await p2pkh.signer.getDefaultAddress()
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
        }
        return expect(callContract()).not.rejected
    })
})
