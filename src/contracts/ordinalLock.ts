import {
    assert,
    ByteString,
    hash256,
    method,
    prop,
    PubKey,
    Addr,
    SmartContract,
    Sig,
    SigHash,
    bsv,
    Provider,
    MethodCallOptions,
    UTXO,
    pubKey2Addr,
} from 'scrypt-ts'

/*
 * Source code by 1Sat Ordinals:
 * https://docs.1satordinals.com/ordinal-lock
 */
export class OrdinalLock extends SmartContract {
    @prop()
    seller: Addr

    @prop()
    payOutput: ByteString

    constructor(seller: Addr, payOutput: ByteString) {
        super(...arguments)

        this.seller = seller
        this.payOutput = payOutput
    }

    @method(SigHash.ANYONECANPAY_ALL)
    public purchase(destOutput: ByteString) {
        assert(
            hash256(destOutput + this.payOutput + this.buildChangeOutput()) ==
                this.ctx.hashOutputs
        )
    }

    @method()
    public cancel(sig: Sig, pubkey: PubKey) {
        assert(this.seller == pubKey2Addr(pubkey), 'bad seller')
        assert(this.checkSig(sig, pubkey), 'signature check failed')
    }
}

// Override default deployment transaction builder to include inscription.
// See:
// https://scrypt.io/docs/how-to-deploy-and-call-a-contract/how-to-customize-a-contract-tx#customize
export function bindInscription(
    ordinalLock: OrdinalLock,
    inscriptionScript: bsv.Script
) {
    ordinalLock.buildDeployTransaction = async (
        utxos: UTXO[],
        amount: number,
        changeAddress?: bsv.Address | string
    ): Promise<bsv.Transaction> => {
        const lsBuff = (ordinalLock.lockingScript as bsv.Script).toBuffer()
        const inscrBuff = inscriptionScript.toBuffer()

        const outScript = bsv.Script.fromBuffer(
            Buffer.concat([lsBuff, Buffer.from('6a', 'hex'), inscrBuff])
        )

        const deployTx = new bsv.Transaction().from(utxos).addOutput(
            new bsv.Transaction.Output({
                script: outScript,
                satoshis: amount,
            })
        )

        if (changeAddress) {
            deployTx.change(changeAddress)
            if (ordinalLock._provider) {
                deployTx.feePerKb(await ordinalLock.provider.getFeePerKb())
            }
        }

        return deployTx
    }
}

export function purchaseTxBuilder(
    current: OrdinalLock,
    options: MethodCallOptions<OrdinalLock>,
    destOutput: ByteString
): Promise<any> {
    const destOutputBR = new bsv.encoding.BufferReader(
        Buffer.from(destOutput, 'hex')
    )
    const payOutputBR = new bsv.encoding.BufferReader(
        Buffer.from(current.payOutput, 'hex')
    )

    const unsignedTx: bsv.Transaction = new bsv.Transaction()
        .addInput(current.buildContractInput())
        .addOutput(bsv.Transaction.Output.fromBufferReader(destOutputBR))
        .addOutput(bsv.Transaction.Output.fromBufferReader(payOutputBR))

    if (options.changeAddress) {
        unsignedTx.change(options.changeAddress)
    }

    const result = {
        tx: unsignedTx,
        atInputIndex: 0, // the contract input's index
    }

    return Promise.resolve(result)
}

export async function reconstructContractInstance(
    txid: string,
    provider: Provider,
    outIdx = 0
): Promise<OrdinalLock> {
    // Fetch tx using a provider.
    const deployTx = await provider.getTransaction(txid)

    //// Truncate inscription in order to be able to reconstruct contract instance.
    //const lockingScript = deployTx.outputs[outIdx].script
    //deployTx.outputs[outIdx].setScript(bsv.Script.fromChunks(lockingScript.chunks.slice(0, lockingScript.chunks.length - 8)))

    // Reconstruct contract instance.
    const instance = OrdinalLock.fromTx(deployTx, outIdx)

    return instance
}
