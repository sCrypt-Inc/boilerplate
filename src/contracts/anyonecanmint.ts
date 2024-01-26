import { BSV20V2 } from 'scrypt-ord'
import {
    ByteString,
    Addr,
    hash256,
    method,
    prop,
    toByteString,
    assert,
    MethodCallOptions,
    ContractTransaction,
    bsv,
} from 'scrypt-ts'

export class Anyonecanmint extends BSV20V2 {
    @prop(true)
    supply: bigint

    @prop()
    lim: bigint

    constructor(
        id: ByteString,
        sym: ByteString,
        max: bigint,
        dec: bigint,
        lim: bigint
    ) {
        super(id, sym, max, dec)
        this.init(...arguments)

        this.supply = max
        this.lim = lim
    }

    @method()
    public mint(dest: Addr, amount: bigint) {
        // Check mint amount doesn't exceed maximum.
        assert(amount <= this.lim, 'mint amount exceeds maximum')
        assert(amount > 0n, 'mint amount should > 0')

        this.supply -= amount
        assert(this.supply >= 0n, 'all supply mint out')
        let outputs = toByteString('')

        if (this.supply > 0n) {
            outputs += this.buildStateOutputFT(this.supply)
        }

        // Build FT P2PKH output to dest paying specified amount of tokens.
        outputs += BSV20V2.buildTransferOutput(dest, this.id, amount)

        // Build change output.
        outputs += this.buildChangeOutput()

        // this.debug.diffOutputs(outputs)

        assert(
            hash256(outputs) === this.ctx.hashOutputs,
            'hashOutputs mismatch'
        )
    }

    static async mintTxBuilder(
        current: Anyonecanmint,
        options: MethodCallOptions<Anyonecanmint>,
        dest: Addr,
        amount: bigint
    ): Promise<ContractTransaction> {
        const defaultAddress = await current.signer.getDefaultAddress()

        const remaining = current.supply - amount

        const tx = new bsv.Transaction().addInput(current.buildContractInput())

        const nexts: any[] = []
        const tokenId = current.getTokenId()
        if (remaining > 0n) {
            const next = current.next()

            if (!next.id) {
                next.id = toByteString(tokenId, true)
            }

            next.supply = remaining
            next.setAmt(remaining)

            tx.addOutput(
                new bsv.Transaction.Output({
                    satoshis: 1,
                    script: next.lockingScript,
                })
            )

            nexts.push({
                instance: next,
                balance: 1,
                atOutputIndex: 0,
            })
        }

        tx.addOutput(
            bsv.Transaction.Output.fromBufferReader(
                new bsv.encoding.BufferReader(
                    Buffer.from(
                        BSV20V2.buildTransferOutput(
                            dest,
                            toByteString(tokenId, true),
                            amount
                        ),
                        'hex'
                    )
                )
            )
        )

        tx.change(options.changeAddress || defaultAddress)
        return { tx, atInputIndex: 0, nexts }
    }
}
