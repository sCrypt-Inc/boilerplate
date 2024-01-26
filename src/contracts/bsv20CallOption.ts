import { BSV20V2 } from 'scrypt-ord'
import {
    assert,
    ByteString,
    hash256,
    method,
    prop,
    PubKey,
    pubKey2Addr,
    Sig,
    Utils,
} from 'scrypt-ts'

export class Bsv20CallOption extends BSV20V2 {
    @prop()
    grantor: PubKey

    @prop(true)
    grantee: PubKey

    @prop()
    tokenAmt: bigint

    @prop()
    strikePrice: bigint

    @prop()
    expirationTime: bigint

    @prop(true)
    forSale: boolean

    @prop(true)
    premium: bigint

    constructor(
        id: ByteString,
        sym: ByteString,
        max: bigint,
        dec: bigint,
        grantor: PubKey,
        grantee: PubKey,
        tokenAmt: bigint,
        strikePrice: bigint,
        expirationTime: bigint,
        forSale: boolean,
        premium: bigint
    ) {
        super(id, sym, max, dec)
        this.init(...arguments)

        this.grantor = grantor
        this.grantee = grantee
        this.tokenAmt = tokenAmt
        this.strikePrice = strikePrice
        this.expirationTime = expirationTime
        this.forSale = forSale
        this.premium = premium
    }

    @method()
    public exercise(sigGrantee: Sig) {
        // Check grantee sig.
        assert(this.checkSig(sigGrantee, this.grantee), 'invalid sig grantee')

        // Ensure grantee gets payed tokens.
        let outputs = BSV20V2.buildTransferOutput(
            pubKey2Addr(this.grantee),
            this.id,
            this.tokenAmt
        )

        // Ensure grantor gets payed satoshis.
        const satAmt = this.strikePrice * this.tokenAmt
        outputs += Utils.buildAddressOutput(pubKey2Addr(this.grantor), satAmt)

        outputs += this.buildChangeOutput()

        // Enforce outputs in call tx.
        assert(hash256(outputs) == this.ctx.hashOutputs, 'hashOutputs mismatch')
    }

    @method()
    public buy(newGrantee: PubKey) {
        // Check if option is up for sale.
        assert(this.forSale, 'option is not up for sale')

        // Set new grantee.
        const prevGrantee = this.grantee
        this.grantee = newGrantee

        // Toggle for sale flag.
        this.forSale = false

        // Propagate contract.
        let outputs = this.buildStateOutputFT(this.tokenAmt)

        // Make sure premium is payed to previous grantee / holder.
        outputs += Utils.buildAddressOutput(
            pubKey2Addr(prevGrantee),
            this.premium
        )

        outputs += this.buildChangeOutput()
        assert(hash256(outputs) == this.ctx.hashOutputs, 'hashOutputs mismatch')
    }

    @method()
    public listForSale(sigGrantee: Sig, premium: bigint) {
        // Check grantee sig.
        assert(this.checkSig(sigGrantee, this.grantee), 'invalid sig grantee')

        // Check premium is a positive integer.
        assert(premium > 0n, 'invalid premium value')

        // Store premium value in property.
        this.premium = premium

        // Toggle for sale flag.
        this.forSale = true

        // Propagate contract.
        let outputs = this.buildStateOutputFT(this.tokenAmt)
        outputs += this.buildChangeOutput()
        assert(hash256(outputs) == this.ctx.hashOutputs, 'hashOutputs mismatch')
    }

    @method()
    public expiry(sigGrantor: Sig) {
        // Check grantor sig.
        assert(this.checkSig(sigGrantor, this.grantor), 'invalid sig grantor')

        // Check if expired.
        assert(this.timeLock(this.expirationTime), 'option has not yet expired')
    }
}
