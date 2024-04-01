import { BSV20V2 } from 'scrypt-ord'
import {
    assert,
    ByteString,
    byteString2Int,
    Constants,
    hash256,
    method,
    prop,
    PubKey,
    pubKey2Addr,
    Sig,
    slice,
    Utils,
} from 'scrypt-ts'
import { RabinPubKey, RabinSig, RabinVerifier } from 'scrypt-ts-lib'

export class Bsv20PutOption extends BSV20V2 {
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

    @prop()
    oraclePubKey: RabinPubKey

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
        premium: bigint,
        oraclePubKey: RabinPubKey
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
        this.oraclePubKey = oraclePubKey
    }

    @method()
    public exercise(
        sigGrantee: Sig,
        oracleSig: RabinSig,
        oracleMsg: ByteString
    ) {
        // Check oracle signature.
        assert(
            RabinVerifier.verifySig(oracleMsg, oracleSig, this.oraclePubKey),
            'oracle sig verify failed'
        )

        // Check that we're unlocking the UTXO specified in the oracles message.
        assert(
            slice(
                this.prevouts,
                Constants.OutpointLen,
                Constants.OutpointLen * 2n
            ) == slice(oracleMsg, 0n, Constants.OutpointLen),
            'second input is not spending specified ordinal UTXO'
        )

        // Get token amount held by the UTXO from oracle message.
        const utxoTokenAmt = byteString2Int(
            slice(oracleMsg, Constants.OutpointLen, 44n)
        )

        // Check token amount is correct.
        assert(utxoTokenAmt == this.tokenAmt, 'invalid token amount')

        // Check grantee sig.
        assert(this.checkSig(sigGrantee, this.grantee), 'invalid sig grantee')

        // Ensure grantor gets payed tokens.
        let outputs = BSV20V2.buildTransferOutput(
            pubKey2Addr(this.grantor),
            this.id,
            this.tokenAmt
        )

        // Ensure grantee gets payed satoshis.
        const satAmt = this.strikePrice * this.tokenAmt
        outputs += Utils.buildAddressOutput(pubKey2Addr(this.grantee), satAmt)

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
        let outputs = this.buildStateOutput(this.ctx.utxo.value)

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

        // Check premium value.
        assert(premium > 0n, 'invalid premium value')

        // Store premium value in property.
        this.premium = premium

        // Toggle for sale flag.
        this.forSale = true

        // Propagate contract.
        let outputs = this.buildStateOutput(this.ctx.utxo.value)
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
