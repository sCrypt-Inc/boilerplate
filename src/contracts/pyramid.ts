import { assert } from 'console'
import {
    PubKey,
    PubKeyHash,
    SmartContract,
    Utils,
    hash256,
    method,
    prop,
    hash160,
    MethodCallOptions,
    ContractTransaction,
    bsv,
    ByteString,
} from 'scrypt-ts'

export class Pyramid extends SmartContract {
    static readonly DUST: bigint = 1n

    @prop(true)
    schemer: PubKeyHash

    @prop()
    entryFee: bigint

    constructor(schemer: PubKeyHash, entryFee: bigint) {
        super(...arguments)
        this.schemer = schemer
        this.entryFee = entryFee
    }

    @method()
    public recruit(recruit0: PubKey, recruit1: PubKey) {
        const commissionOutput = Utils.buildPublicKeyHashOutput(
            this.schemer,
            2n * this.entryFee
        )

        this.schemer = hash160(recruit0)
        const recruit0Output = this.buildStateOutput(Pyramid.DUST)

        this.schemer = hash160(recruit1)
        const recruit1Output = this.buildStateOutput(Pyramid.DUST)

        let outputs: ByteString =
            commissionOutput + recruit0Output + recruit1Output
        outputs += this.buildChangeOutput()

        assert(
            hash256(outputs) == this.ctx.hashOutputs,
            'hash outputs mismatch'
        )
    }

    static recruitTxBuilder(
        current: Pyramid,
        options: MethodCallOptions<Pyramid>,
        recruit0PubKey: PubKey,
        recruit1PubKey: PubKey
    ): Promise<ContractTransaction> {
        const unsignedTx: bsv.Transaction = new bsv.Transaction()
            .addInput(current.buildContractInput(options.fromUTXO))
            .addOutput(
                new bsv.Transaction.Output({
                    script: bsv.Script.fromHex(
                        Utils.buildPublicKeyHashScript(current.schemer)
                    ),
                    satoshis: Number(2n * current.entryFee),
                })
            )

        const recruit0Instance = current.next()
        recruit0Instance.schemer = hash160(recruit0PubKey)

        const recruit1Instance = current.next()
        recruit1Instance.schemer = hash160(recruit1PubKey)

        unsignedTx
            .addOutput(
                new bsv.Transaction.Output({
                    script: recruit0Instance.lockingScript,
                    satoshis: Number(Pyramid.DUST),
                })
            )
            .addOutput(
                new bsv.Transaction.Output({
                    script: recruit1Instance.lockingScript,
                    satoshis: Number(Pyramid.DUST),
                })
            )
            .change(options.changeAddress)

        return Promise.resolve({
            tx: unsignedTx,
            atInputIndex: 0,
            nexts: [
                {
                    instance: recruit0Instance,
                    atOutputIndex: 1,
                    balance: Number(Pyramid.DUST),
                },
                {
                    instance: recruit1Instance,
                    atOutputIndex: 2,
                    balance: Number(Pyramid.DUST),
                },
            ],
        })
    }
}
