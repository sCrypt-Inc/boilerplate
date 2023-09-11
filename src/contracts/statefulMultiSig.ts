import {
    assert,
    method,
    prop,
    PubKey,
    Addr,
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

export type Owner = {
    pubKey: PubKey
    validated: boolean
}

/*
 * A multi-sig contract that collects signatures in separate contract calls.
 * Once the signature threshold is reached, the funds can be payed to the specified
 * destination address.
 * Read Medium article about this contract:
 * https://xiaohuiliu.medium.com/stateful-multisig-on-bitcoin-f3bb40a7f065
 */
export class StatefulMultiSig extends SmartContract {
    // N of M signatures required.
    static readonly N = 2
    static readonly M = 3

    // Payment destination once signature threshold is reached.
    @prop()
    dest: Addr

    // Public keys of the owners along with boolean flags, that
    // indicate if their sig was already validated.
    @prop(true)
    owners: FixedArray<Owner, typeof StatefulMultiSig.M>

    constructor(
        dest: Addr,
        owners: FixedArray<Owner, typeof StatefulMultiSig.M>
    ) {
        super(...arguments)
        this.dest = dest
        this.owners = owners
    }

    @method(SigHash.ANYONECANPAY_SINGLE)
    public pay() {
        // Check if threshold was reached.
        let nValid = 0n
        for (let i = 0; i < StatefulMultiSig.M; i++) {
            if (this.owners[i].validated) {
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
                const owner = this.owners[i]
                const valid = this.checkSig(sig, owner.pubKey)
                if (valid && !owner.validated) {
                    // Toggle flag.
                    this.owners[i].validated = true
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
    static buildTxForPay(
        current: StatefulMultiSig,
        options: MethodCallOptions<StatefulMultiSig>
    ): Promise<ContractTransaction> {
        const tx: bsv.Transaction = new bsv.Transaction()
            // add contract input
            .addInput(current.buildContractInput())
            // add a p2pkh output
            .addOutput(
                new bsv.Transaction.Output({
                    script: bsv.Script.fromHex(
                        Utils.buildPublicKeyHashScript(current.dest)
                    ),
                    satoshis: current.balance,
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
