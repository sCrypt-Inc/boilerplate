import {
    assert,
    ByteString,
    FixedArray,
    hash256,
    method,
    prop,
    PubKey,
    PubKeyHash,
    Sig,
    SigHash,
    SmartContract,
    toByteString,
    Utils,
} from 'scrypt-ts'

/*
 * A multi-sig contract where the order of the signings is enforced.
 * Each signature gets added in a subsequent contract call and once
 * all are submitted, the specified destination address gets payed.
 */
export class OrderedSigStateful extends SmartContract {
    static readonly N_SIGNERS = 3

    @prop()
    msg: ByteString

    @prop()
    signers: FixedArray<PubKey, typeof OrderedSigStateful.N_SIGNERS>

    @prop()
    dest: PubKeyHash

    @prop(true)
    currentSignerIdx: bigint

    constructor(
        msg: ByteString,
        signers: FixedArray<PubKey, typeof OrderedSigStateful.N_SIGNERS>,
        dest: PubKeyHash
    ) {
        super(...arguments)
        this.msg = msg
        this.signers = signers
        this.dest = dest

        // Set signers[0] as the current signer.
        this.currentSignerIdx = 0n
    }

    @method(SigHash.ANYONECANPAY_SINGLE)
    public unlock(sig: Sig) {
        // Check sig for current signer.
        for (let i = 0; i < OrderedSigStateful.N_SIGNERS; i++) {
            if (BigInt(i) == this.currentSignerIdx) {
                const signer = this.signers[i]
                assert(this.checkSig(sig, signer), 'invalid sig')
            }
        }

        // Check if this was the last sig.
        let destScript: ByteString = toByteString('00')
        if (
            this.currentSignerIdx ==
            BigInt(OrderedSigStateful.N_SIGNERS) - 1n
        ) {
            // If yes, pay P2PKH to dest address.
            destScript = Utils.buildPublicKeyHashScript(this.dest)
        } else {
            // If not, increment signer idx and propagate contract.
            this.currentSignerIdx += 1n
            destScript = this.getStateScript()
        }

        // Ensure the next output will be as specified.
        const outputs = Utils.buildOutput(destScript, this.ctx.utxo.value)
        assert(hash256(outputs) == this.ctx.hashOutputs, 'hashOutputs mismatch')
    }
}
