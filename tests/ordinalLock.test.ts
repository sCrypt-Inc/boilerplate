import { expect, use } from 'chai'
import {
    MethodCallOptions,
    bsv,
    Utils,
    findSig,
    PubKey,
    ByteString,
    ContractTransaction,
    Addr,
} from 'scrypt-ts'
import { OrdinalLock, purchaseTxBuilder } from '../src/contracts/ordinalLock'
import chaiAsPromised from 'chai-as-promised'
import { getDefaultSigner } from './utils/helper'
use(chaiAsPromised)

// Listing price.
const price = 10000n

// Seller key.
const seller = bsv.PrivateKey.fromRandom(bsv.Networks.testnet)

// Output that will pay the seller.
const payOutput = Utils.buildPublicKeyHashOutput(
    Addr(seller.toAddress().toByteString()),
    price
)

describe('Test SmartContract `OrdinalLock`', () => {
    let instance: OrdinalLock

    before(async () => {
        OrdinalLock.loadArtifact()
        instance = new OrdinalLock(
            Addr(seller.toAddress().toByteString()),
            payOutput
        )
        await instance.connect(getDefaultSigner(seller))

        // Bind tx builder for public method "purchase"
        instance.bindTxBuilder('purchase', purchaseTxBuilder)
    })

    it('should pass purchase method call successfully.', async () => {
        await instance.deploy(1)

        const buyerSigner = getDefaultSigner()

        const inscriptionScript = bsv.Script.fromASM(
            'OP_FALSE OP_IF 6f7264 OP_TRUE 746578742f706c61696e OP_FALSE 48656c6c6f2c2073437279707421 OP_ENDIF'
        )
        const destOutput = new bsv.Transaction.Output({
            script: inscriptionScript,
            satoshis: 1,
        })
        const destOutputStr = destOutput
            .toBufferWriter()
            .toBuffer()
            .toString('hex')

        const callContract = async () =>
            instance.methods.purchase(destOutputStr, {
                changeAddress: await buyerSigner.getDefaultAddress(),
            } as MethodCallOptions<OrdinalLock>)
        return expect(callContract()).not.rejected
    })

    it('should pass cancel method call successfully.', async () => {
        await instance.deploy(1)

        const callContract = async () =>
            instance.methods.cancel(
                (sigResp) => findSig(sigResp, seller.publicKey),
                PubKey(seller.publicKey.toByteString()),
                {
                    pubKeyOrAddrToSign: seller.publicKey,
                    changeAddress: seller.toAddress(),
                } as MethodCallOptions<OrdinalLock>
            )
        return expect(callContract()).not.rejected
    })

    it('should fail purchase method w wrong payment out.', async () => {
        const wrongPayOutput = Utils.buildPublicKeyHashOutput(
            Addr(
                bsv.PrivateKey.fromRandom(bsv.Networks.testnet)
                    .toAddress()
                    .toByteString()
            ),
            price
        )

        const inscriptionScript = bsv.Script.fromASM(
            'OP_FALSE OP_IF 6f7264 OP_TRUE 746578742f706c61696e OP_FALSE 48656c6c6f2c2073437279707421 OP_ENDIF'
        )
        const destOutput = new bsv.Transaction.Output({
            script: inscriptionScript,
            satoshis: 1,
        })
        const destOutputStr = destOutput
            .toBufferWriter()
            .toBuffer()
            .toString('hex')

        instance.bindTxBuilder(
            'purchase',
            (
                current: OrdinalLock,
                options: MethodCallOptions<OrdinalLock>,
                destOutput: ByteString
            ): Promise<ContractTransaction> => {
                const destOutputBR = new bsv.encoding.BufferReader(
                    Buffer.from(destOutput, 'hex')
                )
                const payOutputBR = new bsv.encoding.BufferReader(
                    Buffer.from(wrongPayOutput, 'hex')
                )

                const unsignedTx: bsv.Transaction = new bsv.Transaction()
                    .addInput(current.buildContractInput())
                    .addOutput(
                        bsv.Transaction.Output.fromBufferReader(destOutputBR)
                    )
                    .addOutput(
                        bsv.Transaction.Output.fromBufferReader(payOutputBR)
                    )

                if (options.changeAddress) {
                    unsignedTx.change(options.changeAddress)
                }

                const result = {
                    tx: unsignedTx,
                    atInputIndex: 0, // the contract input's index
                    nexts: [],
                }

                return Promise.resolve(result)
            }
        )
        const buyerSigner = getDefaultSigner()

        const callContract = async () =>
            instance.methods.purchase(destOutputStr, {
                changeAddress: await buyerSigner.getDefaultAddress(),
            } as MethodCallOptions<OrdinalLock>)
        return expect(callContract()).to.be.rejectedWith(/Execution failed/)
    })

    it('should fail cancel method w bad sig.', async () => {
        const wrongKey = bsv.PrivateKey.fromRandom(bsv.Networks.testnet)
        const wrongSigner = getDefaultSigner(wrongKey)
        await instance.connect(wrongSigner)
        await instance.deploy(1)

        const callContract = async () =>
            instance.methods.cancel(
                (sigResp) => findSig(sigResp, wrongKey.publicKey),
                PubKey(wrongKey.publicKey.toByteString()),
                {
                    pubKeyOrAddrToSign: wrongKey.publicKey,
                    changeAddress: wrongKey.toAddress(),
                } as MethodCallOptions<OrdinalLock>
            )
        return expect(callContract()).to.be.rejectedWith(/bad seller/)
    })
})
