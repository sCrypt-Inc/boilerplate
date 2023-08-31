import {
    PubKey,
    PubKeyHash,
    Sig,
    SmartContract,
    UTXO,
    Utils,
    assert,
    bsv,
    hash160,
    hash256,
    method,
    prop,
    slice,
} from 'scrypt-ts'

export class PermissionedOrdinal extends SmartContract {
    @prop()
    issuer: PubKey

    @prop(true)
    currentOwner: PubKeyHash

    @prop(true)
    isMint: boolean

    @prop()
    inscriptLen: bigint

    constructor(issuer: PubKey, currentOwner: PubKeyHash, inscriptLen: bigint) {
        super(...arguments)
        this.issuer = issuer
        this.currentOwner = currentOwner
        this.isMint = true
        this.inscriptLen = inscriptLen
    }

    @method()
    public transfer(
        sigCurrentOwner: Sig,
        pubKeyCurrentOwner: PubKey,
        sigIssuer: Sig,
        newOwner: PubKeyHash
    ) {
        // Check current owner signature.
        assert(
            hash160(pubKeyCurrentOwner) == this.currentOwner,
            "pubKeyCurrentOwner doesn't correspond to address"
        )
        assert(this.checkSig(sigCurrentOwner, pubKeyCurrentOwner))

        // Check issuer signature.
        assert(this.checkSig(sigIssuer, this.issuer))

        // Set new owners address
        this.currentOwner = newOwner

        // Save a local copy of isMint flag
        const isMint = this.isMint

        // Disable isMint flag after first transfer
        this.isMint = false

        let stateScript = this.getStateScript()
        if (isMint) {
            // Cut leading inscription script.
            stateScript = slice(stateScript, this.inscriptLen)
        }

        // Propagate contract to next output and ensure the value stays 1 sat.
        let outputs = Utils.buildOutput(stateScript, 1n)
        outputs += this.buildChangeOutput()
        assert(this.ctx.hashOutputs == hash256(outputs), 'hashOutputs mismatch')
    }

    override async buildDeployTransaction(
        utxos: UTXO[],
        amount: number,
        changeAddress?: bsv.Address | string
    ): Promise<bsv.Transaction> {
        // Add msg as text/plain inscription.
        const msgBuff = Buffer.from('hello sCrypt', 'utf8')
        const msgHex = msgBuff.toString('hex')
        const inscription = bsv.Script.fromASM(
            `OP_FALSE OP_IF 6f7264 OP_TRUE 746578742f706c61696e OP_FALSE ${msgHex} OP_ENDIF`
        )

        const deployTx = new bsv.Transaction()
            // add p2pkh inputs for paying tx fees
            .from(utxos)
            // add contract output w/ inscription
            .addOutput(
                new bsv.Transaction.Output({
                    script: inscription.add(this.lockingScript),
                    satoshis: amount,
                })
            )

        if (changeAddress) {
            deployTx.change(changeAddress)
            if (this._provider) {
                deployTx.feePerKb(await this.provider.getFeePerKb())
            }
        }

        return deployTx
    }
}
