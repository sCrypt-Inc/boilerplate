import { P2PKH } from '../../src/contracts/p2pkh'
import { getDefaultSigner } from '../utils/helper'
import { myPublicKey, myPublicKeyHash } from '../utils/privateKey'

import {
    findSig,
    MethodCallOptions,
    PubKey,
    PubKeyHash,
    toHex,
    bsv,
    ContractTransaction,
} from 'scrypt-ts'

async function main() {
    await P2PKH.compile()
    const p2pkh = new P2PKH(PubKeyHash(toHex(myPublicKeyHash)))

    // connect to a signer
    const signer = getDefaultSigner()
    await p2pkh.connect(signer)

    // deploy
    const deployTx = await p2pkh.deploy(1)
    console.log('P2PKH contract deployed: ', deployTx.id)

    p2pkh.bindTxBuilder(
        'unlock',
        async (
            current: P2PKH,
            options: MethodCallOptions<P2PKH>
        ): Promise<ContractTransaction> => {
            const tx = new bsv.Transaction()

            tx.addInput(current.buildContractInput()).addOutput(
                new bsv.Transaction.Output({
                    script: bsv.Script.fromASM('OP_FALSE OP_RETURN 0101'),
                    satoshis: 0,
                })
            )

            return {
                tx: tx,
                /** The input index of previous contract UTXO to spend in the method calling tx */
                atInputIndex: 0,
                nexts: [],
            }
        }
    )
    // call
    const { tx: callTx } = await p2pkh.methods.unlock(
        // pass signature, the first parameter, to `unlock`
        // after the signer signs the transaction, the signatures are returned in `SignatureResponse[]`
        // you need to find the signature or signatures you want in the return through the public key or address
        // here we use `myPublicKey` to find the signature because we signed the transaction with `myPrivateKey` before
        (sigResps) =>
            findSig(
                sigResps,
                myPublicKey,
                bsv.crypto.Signature.ANYONECANPAY_SINGLE
            ),
        // pass public key, the second parameter, to `unlock`
        PubKey(toHex(myPublicKey)),
        // method call options
        {
            // tell the signer to use the private key corresponding to `myPublicKey` to sign this transaction
            // that is using `myPrivateKey` to sign the transaction
            pubKeyOrAddrToSign: {
                pubKeyOrAddr: myPublicKey,
                sigHashType: bsv.crypto.Signature.ANYONECANPAY_SINGLE,
            },
            partiallySigned: true,
            autoPayFee: false,
        } as MethodCallOptions<P2PKH>
    )

    const address = await signer.getDefaultAddress()

    const utxos = await signer.listUnspent(address)

    callTx.from(utxos)
    callTx.change(address)
    await signer.signAndsendTransaction(callTx, { address })

    console.log('P2PKH contract called: ', callTx.id)
}

describe('Test SmartContract `P2PKH` with ANYONECANPAY_SINGLE  on testnet', () => {
    it('should succeed', async () => {
        await main()
    })
})
