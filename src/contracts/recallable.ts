import {
    assert,
    ByteString,
    hash256,
    method,
    prop,
    PubKey,
    Sig,
    SmartContract,
    toByteString,
} from 'scrypt-ts'

export class Recallable extends SmartContract {
    @prop()
    readonly issuerPubKey: PubKey

    @prop(true)
    userPubKey: PubKey

    constructor(issuer: PubKey) {
        super(...arguments)
        this.issuerPubKey = issuer
        this.userPubKey = issuer // the first user is the issuer himself
    }

    @method()
    public transfer(
        userSig: Sig,
        receiverPubKey: PubKey,
        satoshisSent: bigint
    ) {
        // total satoshis locked in this contract utxo
        const satoshisTotal = this.ctx.utxo.value
        // require the amount requested to be transferred is valid
        assert(
            satoshisSent > 0 && satoshisSent <= satoshisTotal,
            `invalid value of \`satoshisSent\`, should be greater than 0 and less than or equal to ${satoshisTotal}`
        )

        // require the current user to provide signature before transfer
        assert(
            this.checkSig(userSig, this.userPubKey),
            "user's signature check failed"
        )

        // construct all the outputs of the method calling tx
        let outputs: ByteString = toByteString('')
        // 1. the change output back to `user`
        const satoshisLeft = satoshisTotal - satoshisSent
        if (satoshisLeft > 0) {
            outputs += this.buildStateOutput(satoshisLeft)
        }
        // 2. the output send to `receiver`
        this.userPubKey = receiverPubKey
        outputs += this.buildStateOutput(satoshisSent)
        // 3. the change output for paying the transaction fee
        if (this.changeAmount > 0) {
            outputs += this.buildChangeOutput()
        }

        // require all of these outputs are actually in the unlocking transaction
        assert(
            hash256(outputs) == this.ctx.hashOutputs,
            'hashOutputs check failed'
        )
    }

    @method()
    public recall(issuerSig: Sig) {
        // require the issuer to provide signature before recall
        assert(
            this.checkSig(issuerSig, this.issuerPubKey),
            "issuer's signature check failed"
        )

        this.userPubKey = this.issuerPubKey
        // the amount is satoshis locked in this UTXO
        let outputs = this.buildStateOutput(this.ctx.utxo.value)

        if (this.changeAmount > 0) {
            outputs += this.buildChangeOutput()
        }

        // require all of these outputs are actually in the unlocking transaction
        assert(
            hash256(outputs) == this.ctx.hashOutputs,
            'hashOutputs check failed'
        )
    }
}
