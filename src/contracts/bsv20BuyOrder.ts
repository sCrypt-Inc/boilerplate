import { assert } from 'console'
import {
    ByteString,
    PubKey,
    Addr,
    Sig,
    SmartContract,
    Utils,
    hash256,
    method,
    prop,
    slice,
    pubKey2Addr,
} from 'scrypt-ts'
import { RabinPubKey, RabinSig, RabinVerifier } from 'scrypt-ts-lib'

export class BSV20BuyOrder extends SmartContract {
    // Inscription data of BSV-20 transfer we're
    // looking to buy.
    // This contains the ordered tokens ticker symbol and amount.
    // Example:
    // OP_FALSE OP_IF 6f7264 OP_TRUE application/bsv-20 OP_FALSE
    // {
    //   "p": "bsv-20",
    //   "op": "transfer",
    //   "tick": "ordi",
    //   "amt": "1000"
    // }
    // OP_ENDIF
    @prop()
    transferInscription: ByteString

    // Public key of the oracle, that is used to verify the transfers
    // genesis.
    @prop()
    oraclePubKey: RabinPubKey

    // The buyer's public key.
    @prop()
    buyer: PubKey

    constructor(
        transferInscription: ByteString,
        oraclePubKey: RabinPubKey,
        buyer: PubKey
    ) {
        super(...arguments)
        this.transferInscription = transferInscription
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
            slice(this.prevouts, 0n, 36n) == slice(oracleMsg, 0n, 36n),
            'first input is not spending specified ordinal UTXO'
        )

        // Check that the ordinal UTXO contains the right inscription.
        assert(
            slice(oracleMsg, 36n) == this.transferInscription,
            'unexpected inscription from oracle'
        )

        // Ensure the tokens ared being payed out to the buyer.
        let outScript = Utils.buildPublicKeyHashScript(pubKey2Addr(this.buyer))
        outScript += this.transferInscription
        let outputs = Utils.buildOutput(outScript, 1n)

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
