import { BSV20V2 } from 'scrypt-ord'
import {
    ByteString,
    PubKey,
    Addr,
    Sig,
    Utils,
    hash256,
    method,
    prop,
    slice,
    pubKey2Addr,
    assert,
    len,
    Constants,
} from 'scrypt-ts'
import { RabinPubKey, RabinSig, RabinVerifier } from 'scrypt-ts-lib'

export class BSV20BuyOrder extends BSV20V2 {
    // Amount of tokens we're buying.
    @prop()
    readonly tokenAmt: bigint

    // Public key of the oracle, that is used to verify the transfers
    // genesis.
    @prop()
    oraclePubKey: RabinPubKey

    // The buyer's public key.
    @prop()
    buyer: PubKey

    constructor(
        id: ByteString,
        sym: ByteString,
        max: bigint,
        dec: bigint,
        tokenAmt: bigint,
        oraclePubKey: RabinPubKey,
        buyer: PubKey
    ) {
        super(id, sym, max, dec)
        this.init(...arguments)

        this.tokenAmt = tokenAmt
        this.oraclePubKey = oraclePubKey
        this.buyer = buyer
    }

    @method()
    public unlock(
        oracleMsg: ByteString,
        oracleSig: RabinSig,
        sellerAddr: Addr
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

        // Build transfer inscription.
        const transferInscription = BSV20V2.createTransferInsciption(
            this.id,
            this.tokenAmt
        )
        const transferInscriptionLen = len(transferInscription)

        // Check that the ordinal UTXO contains the right inscription.
        assert(
            slice(oracleMsg, transferInscriptionLen) == transferInscription,
            'unexpected inscription from oracle'
        )

        // Ensure the tokens are being payed out to the buyer.
        let outputs = BSV20V2.buildTransferOutput(
            pubKey2Addr(this.buyer),
            this.id,
            this.tokenAmt
        )

        // Ensure the second output is paying the offer to the seller.
        outputs += Utils.buildPublicKeyHashOutput(
            sellerAddr,
            this.ctx.utxo.value
        )

        // Add change output.
        outputs += this.buildChangeOutput()

        // Check outputs.
        assert(hash256(outputs) == this.ctx.hashOutputs, 'hashOutputs mismatch')
    }

    @method()
    public cancel(buyerSig: Sig) {
        assert(this.checkSig(buyerSig, this.buyer))
    }
}
