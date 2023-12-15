import { BSV20V2 } from 'scrypt-ord'
import {
    ByteString,
    Addr,
    hash256,
    method,
    prop,
    toByteString,
    assert,
} from 'scrypt-ts'

export class BSV20Mint extends BSV20V2 {
    @prop(true)
    supply: bigint

    @prop()
    maxMintAmount: bigint

    constructor(
        id: ByteString,
        sym: ByteString,
        max: bigint,
        dec: bigint,
        supply: bigint,
        maxMintAmount: bigint
    ) {
        super(id, sym, max, dec)
        this.init(...arguments)

        this.supply = supply
        this.maxMintAmount = maxMintAmount
    }

    @method()
    public mint(dest: Addr, amount: bigint) {
        // Check mint amount doesn't exceed maximum.
        assert(amount <= this.maxMintAmount, 'mint amount exceeds maximum')

        let outputs = toByteString('')
        let transferAmt = amount

        if (this.supply > transferAmt) {
            // If there are still tokens left, then update supply and
            // build state output inscribed with leftover tokens.
            this.supply -= transferAmt
            outputs += this.buildStateOutputFT(this.supply)
        } else {
            // If not, then transfer all the remaining supply.
            transferAmt = this.supply
        }

        // Build FT P2PKH output to dest paying specified amount of tokens.
        outputs += BSV20V2.buildTransferOutput(dest, this.id, transferAmt)

        // Build change output.
        outputs += this.buildChangeOutput()

        assert(hash256(outputs) == this.ctx.hashOutputs, 'hashOutputs mismatch')
    }
}
