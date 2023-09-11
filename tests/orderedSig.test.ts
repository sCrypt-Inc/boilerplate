import { expect, use } from 'chai'
import chaiAsPromised from 'chai-as-promised'
import {
    Addr,
    bsv,
    ContractTransaction,
    hash256,
    MethodCallOptions,
    PubKey,
    toByteString,
    Utils,
} from 'scrypt-ts'
import { signTx } from 'scryptlib'
import { OrderedSig } from '../src/contracts/orderedSig'
import { getDefaultSigner } from './utils/helper'
import { myPublicKey } from './utils/privateKey'
import { Signature } from 'scrypt-ts-lib'

use(chaiAsPromised)

const N_SIGNERS = 3

describe('Heavy: Test SmartContract `OrderedSig`', () => {
    const destAddr = Addr(myPublicKey.toAddress().toByteString())

    const privKeys: bsv.PrivateKey[] = []
    const pubKeys: bsv.PublicKey[] = []

    const msg = toByteString('Hello, sCrypt!', true)

    before(() => {
        for (let i = 0; i < N_SIGNERS; i++) {
            const privKey = bsv.PrivateKey.fromRandom(bsv.Networks.testnet)
            const pubKey = new bsv.PublicKey(privKey.publicKey.point, {
                compressed: false,
            })
            privKeys.push(privKey)
            pubKeys.push(pubKey)
        }

        OrderedSig.loadArtifact()
    })

    it('should pass w correct sigs', async () => {
        const orderedSig = new OrderedSig(
            msg,
            PubKey(pubKeys[0].toByteString()),
            PubKey(pubKeys[1].toByteString()),
            PubKey(pubKeys[2].toByteString()),
            destAddr
        )
        await orderedSig.connect(getDefaultSigner(privKeys[0]))

        const deployTx = await orderedSig.deploy(1)
        console.log('OrderedSig contract deployed: ', deployTx.id)

        // sig0 is a regular transaction sig. The other two
        // are non-standard signatures and are created manually.

        const tx = new bsv.Transaction()
            .from({
                txId: deployTx.id,
                outputIndex: 0,
                script: '',
                satoshis: orderedSig.balance,
            })
            .addOutput(
                new bsv.Transaction.Output({
                    script: bsv.Script.fromHex(
                        Utils.buildPublicKeyHashScript(destAddr)
                    ),
                    satoshis: orderedSig.balance,
                })
            )
        const sig0 = signTx(
            tx,
            privKeys[0],
            orderedSig.lockingScript,
            orderedSig.balance,
            0,
            bsv.crypto.Signature.ANYONECANPAY_SINGLE
        )

        let hashBuff = Buffer.from(hash256(sig0), 'hex')
        const oracleSigObj1 = bsv.crypto.ECDSA.sign(hashBuff, privKeys[1])
        const sig1: Signature = {
            r: BigInt(oracleSigObj1['r'].toString()),
            s: BigInt(oracleSigObj1['s'].toString()),
        }

        hashBuff = Buffer.from(OrderedSig.hashSignature(sig1), 'hex')
        const oracleSigObj2 = bsv.crypto.ECDSA.sign(hashBuff, privKeys[2])
        const sig2: Signature = {
            r: BigInt(oracleSigObj2['r'].toString()),
            s: BigInt(oracleSigObj2['s'].toString()),
        }

        // Bind custom tx builder to make next output be a P2PKH
        // that pays the specified destination address.
        orderedSig.bindTxBuilder(
            'unlock',
            (
                current: OrderedSig,
                options: MethodCallOptions<OrderedSig>,
                ...args: any
            ): Promise<ContractTransaction> => {
                const tx = new bsv.Transaction()
                    // add contract input
                    .addInput(current.buildContractInput())
                    // add a p2pkh output
                    .addOutput(
                        new bsv.Transaction.Output({
                            script: bsv.Script.fromHex(
                                Utils.buildPublicKeyHashScript(current.dest)
                            ),
                            satoshis: current.balance,
                        })
                    )
                if (options.changeAddress) {
                    // add change output
                    tx.change(options.changeAddress)
                }

                const result = {
                    tx: tx,
                    atInputIndex: 0, // the contract input's index
                    nexts: [],
                }

                return Promise.resolve(result)
            }
        )
        const callContract = async () =>
            orderedSig.methods.unlock(
                (_) => sig0,
                sig1,
                sig2,
                // Method call options:
                {
                    changeAddress: await orderedSig.signer.getDefaultAddress(),
                } as MethodCallOptions<OrderedSig>
            )
        return expect(callContract()).not.rejected
    })
})
