import { BSV20V2 } from 'scrypt-ord'
import {
    Addr,
    assert,
    ByteString,
    hash256,
    int2ByteString,
    method,
    prop,
    slice,
    toByteString,
    Utils,
} from 'scrypt-ts'

export class BSV20LockToMint extends BSV20V2 {
    @prop(true)
    supply: bigint

    // Amount of sats to lock up in order to mint a single token.
    @prop()
    hodlRate: bigint

    // Minimum deadline until you have to lock to mint new
    // tokens.
    @prop()
    hodlDeadline: bigint

    // Hodl lock script.
    @prop()
    lockupScript: ByteString

    constructor(
        id: ByteString,
        sym: ByteString,
        max: bigint,
        dec: bigint,
        supply: bigint,
        hodlRate: bigint,
        hodlDeadline: bigint,
        lockupScript: ByteString
    ) {
        super(id, sym, max, dec)
        this.init(...arguments)

        this.supply = supply
        this.hodlRate = hodlRate
        this.hodlDeadline = hodlDeadline
        this.lockupScript = lockupScript
    }

    @method()
    public mint(ordinalAddress: Addr, lockAddress: Addr, amount: bigint) {
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

        // Build FT P2PKH output paying specified amount of tokens.
        outputs += BSV20V2.buildTransferOutput(
            ordinalAddress,
            this.id,
            transferAmt
        )

        // Make sure satoshis are locked.
        const lockupScriptFinal =
            slice(this.lockupScript, 0n, 114n) +
            lockAddress +
            int2ByteString(this.hodlDeadline, 4n) +
            slice(this.lockupScript, 138n)
        outputs += Utils.buildOutput(
            lockupScriptFinal,
            transferAmt * this.hodlRate
        )

        // Build change output.
        outputs += this.buildChangeOutput()

        assert(hash256(outputs) == this.ctx.hashOutputs, 'hashOutputs mismatch')
    }
}
