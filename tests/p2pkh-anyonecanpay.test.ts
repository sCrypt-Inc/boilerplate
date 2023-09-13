import { P2PKH } from '../src/contracts/p2pkh'
import { getDefaultSigner, getNewSigner } from './utils/helper'

import {
    findSig,
    MethodCallOptions,
    PubKey,
    bsv,
    ContractTransaction,
    Addr,
} from 'scrypt-ts'

import { expect } from 'chai'

describe('Test SmartContract `P2PKH` with ANYONECANPAY_SINGLE', () => {
    const ownerPrivkey = bsv.PrivateKey.fromRandom(bsv.Networks.testnet)
    const ownerAddress = ownerPrivkey.toAddress()
    before(() => {
        P2PKH.loadArtifact()
    })

    it('should succeed at first Input', async () => {
        const p2pkh = new P2PKH(Addr(ownerAddress.toByteString()))

        // Signer who unlocks / signs P2PKH UTXO.
        const ownerSigner = getNewSigner(ownerPrivkey)

        // Signer who pays fee.
        // For simplicity here, we just again use the same default signer, but it
        // could be any other signer.
        const feeSigner = getDefaultSigner()

        // Connect the signer.
        await p2pkh.connect(feeSigner)

        // Deploy the P2PKH contract.
        await p2pkh.deploy(1)

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

                const utxos = await feeSigner.listUnspent(address)

                // Spend retrieved UTXOs to pay the transaction fee. Any change will
                // be returned to the fee signers address.
                tx.from(utxos).change(address)

                return {
                    tx: tx,
                    /** The input index of previous contract UTXO to spend in the method calling tx */
                    atInputIndex: 0,
                    nexts: [],
                }
            }
        )

        const address = await feeSigner.getDefaultAddress()
        // Construct the call tx locally (notice the "pratiallySigned" flag).
        // Use the ANYONECANPAY_SINGLE sighash flag to sign the first input.
        const sigHashType = bsv.crypto.Signature.ANYONECANPAY_SINGLE

        // switch to owner signer
        await p2pkh.connect(ownerSigner)

        const call = async () => {
            const { tx: callTx } = await p2pkh.methods.unlock(
                // pass signature, the first parameter, to `unlock`
                // after the signer signs the transaction, the signatures are returned in `SignatureResponse[]`
                // you need to find the signature or signatures you want in the return through the public key or address
                // here we use `myPublicKey` to find the signature because we signed the transaction with `myPrivateKey` before
                (sigResps) =>
                    findSig(sigResps, ownerPrivkey.publicKey, sigHashType),
                // pass public key, the second parameter, to `unlock`
                PubKey(ownerPrivkey.publicKey.toByteString()),
                // method call options
                {
                    // tell the signer to use the private key corresponding to `myPublicKey` to sign this transaction
                    // that is using `myPrivateKey` to sign the transaction
                    pubKeyOrAddrToSign: {
                        pubKeyOrAddr: ownerPrivkey.publicKey,
                        sigHashType: sigHashType,
                    },
                    // this flag will make the call tx not broadcast, but only be created locally
                    partiallySigned: true,
                    // don't auto-add any fee inputs
                    autoPayFee: false,
                } as MethodCallOptions<P2PKH>
            )

            // Finally, sign the newly added inputs and broadcast the modified transaction.
            // Notice, that if the main singer wouldn't use the ANYONECANPAY_SINGLE sighash flag,
            // Then the call to the "unlock" method (first input) wouldn't successfully evaluate anymore.
            await feeSigner.signAndsendTransaction(callTx, { address })
        }

        await expect(call()).to.be.not.rejected
    })

    it('should succeed at second Input', async () => {
        const p2pkh = new P2PKH(Addr(ownerAddress.toByteString()))

        // Signer who unlocks / signs P2PKH UTXO.
        const ownerSigner = getNewSigner(ownerPrivkey)

        // Signer who pays fee.
        // For simplicity here, we just again use the same default signer, but it
        // could be any other signer.
        const feeSigner = getDefaultSigner()

        // Connect the signer.
        await p2pkh.connect(feeSigner)

        // Deploy the P2PKH contract.
        await p2pkh.deploy(1)

        const tx = new bsv.Transaction()

        // Get UTXOs for for the signer, who will pay the fee.
        const address = await feeSigner.getDefaultAddress()

        const utxos = await feeSigner.listUnspent(address)

        // Spend retrieved UTXOs to pay the transaction fee. Any change will
        // be returned to the fee signers address.
        tx.from(utxos).change(address)

        // Bind custom call tx builder. It adds a single input, which will call
        // our deployed smart contracts "unlock" method. Additionally, it adds an
        // unspendable OP_RETURN output.
        p2pkh.bindTxBuilder(
            'unlock',
            async (
                current: P2PKH,
                options: MethodCallOptions<P2PKH>
            ): Promise<ContractTransaction> => {
                const inputLen = tx.inputs.length
                tx.addInput(current.buildContractInput()).addOutput(
                    new bsv.Transaction.Output({
                        script: bsv.Script.fromASM('OP_FALSE OP_RETURN 0101'),
                        satoshis: 0,
                    })
                )

                return {
                    tx: tx,
                    /** The input index of previous contract UTXO to spend in the method calling tx */
                    atInputIndex: inputLen,
                    nexts: [],
                }
            }
        )

        // // Construct the call tx locally (notice the "pratiallySigned" flag).
        // // Use the ANYONECANPAY_SINGLE sighash flag to sign the first input.
        const sigHashType = bsv.crypto.Signature.ANYONECANPAY_SINGLE

        await p2pkh.connect(ownerSigner)

        const call = async () => {
            const { tx: callTx } = await p2pkh.methods.unlock(
                // pass signature, the first parameter, to `unlock`
                // after the signer signs the transaction, the signatures are returned in `SignatureResponse[]`
                // you need to find the signature or signatures you want in the return through the public key or address
                // here we use `myPublicKey` to find the signature because we signed the transaction with `myPrivateKey` before
                (sigResps) =>
                    findSig(sigResps, ownerPrivkey.publicKey, sigHashType),
                // pass public key, the second parameter, to `unlock`
                PubKey(ownerPrivkey.publicKey.toByteString()),
                // method call options
                {
                    // tell the signer to use the private key corresponding to `myPublicKey` to sign this transaction
                    // that is using `myPrivateKey` to sign the transaction
                    pubKeyOrAddrToSign: {
                        pubKeyOrAddr: ownerPrivkey.publicKey,
                        sigHashType: sigHashType,
                    },
                    partiallySigned: true,
                    autoPayFee: false,
                } as MethodCallOptions<P2PKH>
            )

            // Finally, sign the newly added inputs and broadcast the modified transaction.
            // Notice, that if the main singer wouldn't use the ANYONECANPAY_SINGLE sighash flag,
            // Then the call to the "unlock" method (first input) wouldn't successfully evaluate anymore.
            await feeSigner.signAndsendTransaction(callTx, { address })
        }

        await expect(call()).to.be.not.rejected
    })
})
