import { expect, use } from 'chai'
import {
    MethodCallOptions,
    bsv,
    PubKeyHash,
    Utils,
    findSig,
    PubKey,
    hash160,
    ByteString,
} from 'scrypt-ts'
import { OrdinalLock, purchaseTxBuilder } from '../../src/contracts/ordinalLock'
import chaiAsPromised from 'chai-as-promised'
import { getDummySigner, getDummyUTXO } from '../utils/helper'
use(chaiAsPromised)

// Listing price.
const price = 10000n

// Seller key.
const seller = bsv.PrivateKey.fromRandom(bsv.Networks.testnet)

// Output that will pay the seller.
const payOutput = Utils.buildPublicKeyHashOutput(
    hash160(seller.publicKey.toHex()),
    price
)

describe('Test SmartContract `OrdinalLock`', () => {
    let instance: OrdinalLock

    before(async () => {
        await OrdinalLock.compile()
        instance = new OrdinalLock(
            PubKeyHash(hash160(seller.publicKey.toHex())),
            payOutput
        )
        await instance.connect(getDummySigner(seller))

        // Bind tx builder for public method "purchase"
        instance.bindTxBuilder('purchase', purchaseTxBuilder)
    })

    it('should pass purchase method call successfully.', async () => {
        const buyerSigner = getDummySigner()

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

        const { tx: callTx, atInputIndex } = await instance.methods.purchase(
            destOutputStr,
            {
                fromUTXO: getDummyUTXO(),
                changeAddress: await buyerSigner.getDefaultAddress(),
            } as MethodCallOptions<OrdinalLock>
        )
        const result = callTx.verifyScript(atInputIndex)
        expect(result.success, result.error).to.eq(true)
    })

    it('should pass cancel method call successfully.', async () => {
        const { tx: callTx, atInputIndex } = await instance.methods.cancel(
            (sigResp) => findSig(sigResp, seller.publicKey),
            PubKey(seller.publicKey.toHex()),
            {
                fromUTXO: getDummyUTXO(),
                pubKeyOrAddrToSign: seller.publicKey,
                changeAddress: seller.toAddress(),
            } as MethodCallOptions<OrdinalLock>
        )
        const result = callTx.verifyScript(atInputIndex)
        expect(result.success, result.error).to.eq(true)
    })

    it('should fail purchase method w wrong payment out.', async () => {
        const wrongPayOutput = Utils.buildPublicKeyHashOutput(
            hash160(bsv.PrivateKey.fromRandom().publicKey.toHex()),
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
            ): Promise<any> => {
                const destOutputBR = new bsv.encoding.BufferReader(
                    Buffer.from(destOutput, 'hex')
                )
                const payOutputBR = new bsv.encoding.BufferReader(
                    Buffer.from(wrongPayOutput, 'hex')
                )

                const unsignedTx: bsv.Transaction = new bsv.Transaction()
                    .addInput(current.buildContractInput(options.fromUTXO))
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
                }

                return Promise.resolve(result)
            }
        )
        const buyerSigner = getDummySigner()

        return expect(
            instance.methods.purchase(destOutputStr, {
                fromUTXO: getDummyUTXO(),
                changeAddress: await buyerSigner.getDefaultAddress(),
            } as MethodCallOptions<OrdinalLock>)
        ).to.be.rejectedWith(/Execution failed/)
    })

    it('should fail cancel method w bad sig.', async () => {
        const wrongKey = bsv.PrivateKey.fromRandom()
        const wrongSigner = getDummySigner(wrongKey)
        instance.connect(wrongSigner)

        return expect(
            instance.methods.cancel(
                (sigResp) => findSig(sigResp, wrongKey.publicKey),
                PubKey(wrongKey.publicKey.toHex()),
                {
                    fromUTXO: getDummyUTXO(),
                    pubKeyOrAddrToSign: wrongKey.publicKey,
                    changeAddress: wrongKey.toAddress(),
                } as MethodCallOptions<OrdinalLock>
            )
        ).to.be.rejectedWith(/bad seller/)
    })
})
