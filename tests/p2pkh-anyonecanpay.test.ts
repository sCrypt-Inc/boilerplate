import { P2PKH } from '../src/contracts/p2pkh'
import { getDefaultSigner, resetDefaultSigner, sleep } from './utils/helper'
import { myPublicKey, myPublicKeyHash } from './utils/privateKey'

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

    // Signer who unlocks / signs P2PKH UTXO.
    const mainSigner = getDefaultSigner()

    // Signer who pays fee.
    // For simplicity here, we just again use the same default signer, but it
    // could be any other signer.
    const feeSigner = getDefaultSigner()

    // Connect the signer.
    await p2pkh.connect(mainSigner)

    // Deploy the P2PKH contract.
    const deployTx = await p2pkh.deploy(1)
    console.log('P2PKH contract deployed: ', deployTx.id)

    // Bind custom call tx builder. It adds a single input, which will call
    // our deployed smart contracts "unlock" method. Additionally, it adds an
    // unspendable OP_RETURN output.
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

    // Construct the call tx locally (notice the "pratiallySigned" flag).
    // Use the ANYONECANPAY_SINGLE sighash flag to sign the first input.
    const sigHashType = bsv.crypto.Signature.ANYONECANPAY_SINGLE
    const { tx: callTx } = await p2pkh.methods.unlock(
        // pass signature, the first parameter, to `unlock`
        // after the signer signs the transaction, the signatures are returned in `SignatureResponse[]`
        // you need to find the signature or signatures you want in the return through the public key or address
        // here we use `myPublicKey` to find the signature because we signed the transaction with `myPrivateKey` before
        (sigResps) => findSig(sigResps, myPublicKey, sigHashType),
        // pass public key, the second parameter, to `unlock`
        PubKey(toHex(myPublicKey)),
        // method call options
        {
            // tell the signer to use the private key corresponding to `myPublicKey` to sign this transaction
            // that is using `myPrivateKey` to sign the transaction
            pubKeyOrAddrToSign: {
                pubKeyOrAddr: myPublicKey,
                sigHashType: sigHashType,
            },
            // this flag will make the call tx not broadcast, but only be created locally
            partiallySigned: true,
            // don't auto-add any fee inputs
            autoPayFee: false,
        } as MethodCallOptions<P2PKH>
    )

    // Get UTXOs for for the signer, who will pay the fee.
    const address = await feeSigner.getDefaultAddress()
    await sleep(3)
    const utxos = await feeSigner.listUnspent(address)

    // Spend retrieved UTXOs to pay the transaction fee. Any change will
    // be returned to the fee signers address.
    callTx.from(utxos)
    callTx.change(address)

    // Finally, sign the newly added inputs and broadcast the modified transaction.
    // Notice, that if the main singer wouldn't use the ANYONECANPAY_SINGLE sighash flag,
    // Then the call to the "unlock" method (first input) wouldn't successfully evaluate anymore.
    await feeSigner.signAndsendTransaction(callTx, { address })

    console.log('P2PKH contract called: ', callTx.id)
}

async function main2() {
    const p2pkh = new P2PKH(PubKeyHash(toHex(myPublicKeyHash)))

    // Signer who unlocks / signs P2PKH UTXO.
    const mainSigner = getDefaultSigner()

    // Signer who pays fee.
    // For simplicity here, we just again use the same default signer, but it
    // could be any other signer.
    const feeSigner = getDefaultSigner()

    // Connect the signer.
    await p2pkh.connect(mainSigner)

    // Deploy the P2PKH contract.
    const deployTx = await p2pkh.deploy(1)
    console.log('main2 P2PKH contract deployed: ', deployTx.id)

    // Bind custom call tx builder. It adds a single input, which will call
    // our deployed smart contracts "unlock" method. Additionally, it adds an
    // unspendable OP_RETURN output.
    p2pkh.bindTxBuilder(
        'unlock',
        async (
            current: P2PKH,
            options: MethodCallOptions<P2PKH>
        ): Promise<ContractTransaction> => {
            const tx = new bsv.Transaction()

            // Get UTXOs for for the signer, who will pay the fee.
            const address = await feeSigner.getDefaultAddress()

            await sleep(3)
            const utxos = await feeSigner.listUnspent(address)

            // Spend retrieved UTXOs to pay the transaction fee. Any change will
            // be returned to the fee signers address.
            tx.from(utxos)

            tx.addInput(current.buildContractInput()).addOutput(
                new bsv.Transaction.Output({
                    script: bsv.Script.fromASM('OP_FALSE OP_RETURN 0101'),
                    satoshis: 0,
                })
            )

            return {
                tx: tx,
                /** The input index of previous contract UTXO to spend in the method calling tx */
                atInputIndex: utxos.length,
                nexts: [],
            }
        }
    )

    // Construct the call tx locally (notice the "pratiallySigned" flag).
    // Use the ANYONECANPAY_SINGLE sighash flag to sign the first input.
    const sigHashType = bsv.crypto.Signature.ANYONECANPAY_SINGLE
    const { tx: callTx } = await p2pkh.methods.unlock(
        // pass signature, the first parameter, to `unlock`
        // after the signer signs the transaction, the signatures are returned in `SignatureResponse[]`
        // you need to find the signature or signatures you want in the return through the public key or address
        // here we use `myPublicKey` to find the signature because we signed the transaction with `myPrivateKey` before
        (sigResps) => findSig(sigResps, myPublicKey, sigHashType),
        // pass public key, the second parameter, to `unlock`
        PubKey(toHex(myPublicKey)),
        // method call options
        {
            // tell the signer to use the private key corresponding to `myPublicKey` to sign this transaction
            // that is using `myPrivateKey` to sign the transaction
            pubKeyOrAddrToSign: {
                pubKeyOrAddr: myPublicKey,
                sigHashType: sigHashType,
            },
            // this flag will make the call tx not broadcast, but only be created locally
            partiallySigned: true,
            // don't auto-add any fee inputs
            autoPayFee: false,
        } as MethodCallOptions<P2PKH>
    )

    const address = await feeSigner.getDefaultAddress()
    callTx.change(address)

    // Finally, sign the newly added inputs and broadcast the modified transaction.
    // Notice, that if the main singer wouldn't use the ANYONECANPAY_SINGLE sighash flag,
    // Then the call to the "unlock" method (first input) wouldn't successfully evaluate anymore.

    await feeSigner.signAndsendTransaction(callTx, { address })

    console.log('main2 P2PKH contract called: ', callTx.id)
}

describe('Test SmartContract `P2PKH` with ANYONECANPAY_SINGLE', () => {
    it('should succeed', async () => {
        await P2PKH.compile()
        // contract at first inputIndex
        await main()
        resetDefaultSigner()
        await sleep(5)
        // contract at third inputIndex
        await main2()
        resetDefaultSigner()
    })
})
