import {
    assert,
    method,
    prop,
    PubKey,
    PubKeyHash,
    Sig,
    SmartContract,
    FixedArray,
    SigHash,
    hash256,
    ByteString,
    Utils,
    MethodCallOptions,
    ContractTransaction,
    bsv,
} from 'scrypt-ts'

export class StatefulMultiSig extends SmartContract {
    // N of M signatures required.
    static readonly N = 2
    static readonly M = 3

    // Payment destination once signature threshold is reached.
    @prop()
    dest: PubKeyHash

    // Public keys of the owners.
    @prop()
    pubKeys: FixedArray<PubKey, typeof StatefulMultiSig.M>

    // Array of boolean flags to indicate public keys for which
    // a valid signature was provided.
    @prop(true)
    validated: FixedArray<boolean, typeof StatefulMultiSig.M>

    constructor(
        dest: PubKeyHash,
        pubKeys: FixedArray<PubKey, typeof StatefulMultiSig.M>,
        validated: FixedArray<boolean, typeof StatefulMultiSig.M>
    ) {
        super(...arguments)
        this.dest = dest
        this.pubKeys = pubKeys
        this.validated = validated
    }

    @method(SigHash.ANYONECANPAY_SINGLE)
    public pay() {
        // Check if threshold was reached.
        let nValid = 0n
        for (let i = 0; i < StatefulMultiSig.M; i++) {
            if (this.validated[i]) {
                nValid += 1n
            }
        }
        assert(
            nValid >= BigInt(StatefulMultiSig.N),
            'Not enough valid signatures.'
        )

        // Make sure balance in the contract does not change.
        const amount: bigint = this.ctx.utxo.value
        // Pay destination address
        const output: ByteString = Utils.buildPublicKeyHashOutput(
            this.dest,
            amount
        )
        // Verify unlocking tx has this output.
        assert(this.ctx.hashOutputs == hash256(output), 'hashOutputs mismatch')
    }

    @method(SigHash.ANYONECANPAY_SINGLE)
    public add(sig: Sig, pubKeyIdx: bigint) {
        let added = false

        for (let i = 0; i < StatefulMultiSig.M; i++) {
            if (BigInt(i) == pubKeyIdx) {
                const valid = this.checkSig(sig, this.pubKeys[i])
                const alreadyValidated = this.validated[i]
                if (valid && !alreadyValidated) {
                    // Toggle flag.
                    this.validated[i] = true
                    added = true
                }
            }
        }

        // Make sure at least one new valid sig was added.
        assert(added, 'No new valid signature was provided.')

        // Make sure balance in the contract does not change.
        const amount: bigint = this.ctx.utxo.value
        // Output containing the latest state.
        const output: ByteString = this.buildStateOutput(amount)
        // Verify unlocking tx has this single output.
        assert(this.ctx.hashOutputs == hash256(output), 'hashOutputs mismatch')
    }

    // Custom tx builder for calling function `pay`.
    // Includes P2PKH output that pays set destination address.
    static payTxBuilder(
        current: StatefulMultiSig,
        options: MethodCallOptions<StatefulMultiSig>
    ): Promise<ContractTransaction> {
        const tx: bsv.Transaction = new bsv.Transaction()
            // add contract input
            .addInput(current.buildContractInput(options.fromUTXO))
            // add a p2pkh output
            .addOutput(
                new bsv.Transaction.Output({
                    script: bsv.Script.fromHex(
                        Utils.buildPublicKeyHashScript(current.dest)
                    ),
                    satoshis: options.fromUTXO.satoshis,
                })
            )
            // add change output
            .change(options.changeAddress)

        const result = {
            tx: tx,
            atInputIndex: 0, // the contract input's index
            nexts: [],
        }

        return Promise.resolve(result)
    }
}
