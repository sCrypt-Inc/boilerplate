import {
    assert,
    ByteString,
    hash160,
    hash256,
    HashedMap,
    method,
    prop,
    PubKey,
    Sig,
    SmartContract,
    Utils,
    bsv,
    MethodCallOptions,
    ContractTransaction,
    StatefulNext,
} from 'scrypt-ts'

/*
 * Read Medium article about this contract:
 * https://xiaohuiliu.medium.com/crowdfunding-on-bitcoin-169c1f8b6b63
 */

export type DonorMap = HashedMap<PubKey, bigint>

export class CrowdfundStateful extends SmartContract {
    @prop()
    beneficiary: PubKey

    @prop(true)
    donor: DonorMap

    @prop()
    readonly deadline: bigint

    @prop()
    readonly target: bigint

    constructor(
        beneficiary: PubKey,
        donor: DonorMap,
        deadline: bigint,
        target: bigint
    ) {
        super(...arguments)
        this.beneficiary = beneficiary
        this.donor = donor
        this.deadline = deadline
        this.target = target
    }

    // method to donate
    @method()
    public donate(contributor: PubKey, amount: bigint) {
        // donation not equal to zero
        assert(amount > 0n, 'Donation should be greater than 0')

        // can only donate once
        assert(
            !this.donor.has(contributor),
            'donation from this pub key already present'
        )

        this.donor.set(contributor, amount)

        //updating the contract state
        const output: ByteString =
            this.buildStateOutput(this.ctx.utxo.value + amount) +
            this.buildChangeOutput()

        assert(hash256(output) == this.ctx.hashOutputs, 'hashOutputs mismatch')
    }

    // Method to collect pledged fund.
    @method()
    public collect(sig: Sig) {
        // Ensure the collected amount actually reaches the target.
        assert(this.ctx.utxo.value >= this.target)

        // Check deadline.
        assert(
            this.timeLock(this.deadline),
            'the beneficiary cannot collect before fundraising expired'
        )

        // Funds go to the beneficiary.
        const outputs =
            Utils.buildPublicKeyHashOutput(
                hash160(this.beneficiary),
                this.ctx.utxo.value
            ) + this.buildChangeOutput()

        assert(hash256(outputs) == this.ctx.hashOutputs, 'hashOutputs mismatch')
        // Validate signature of beneficiary
        assert(
            this.checkSig(sig, this.beneficiary),
            'beneficiary signature check failed'
        )
    }

    // donors can be refunded after the deadline.
    @method()
    public refund(contributor: PubKey, amount: bigint, sig: Sig) {
        // checking the validity of the signature
        assert(this.checkSig(sig, contributor), 'donor signature check failed')

        assert(this.donor.canGet(contributor, amount), 'not denoted before')

        // removing donor from the donators list
        assert(this.donor.delete(contributor), 'removing donator failed')

        // update state outputs
        const output =
            this.buildStateOutput(this.ctx.utxo.value - amount) +
            Utils.buildPublicKeyHashOutput(hash160(contributor), amount) +
            this.buildChangeOutput()

        // console.log('outputs ', this.debug.diffOutputs(outputs))
        assert(hash256(output) == this.ctx.hashOutputs, 'hashOutput Misssmatch')
    }

    // User defined transaction builder for calling function `collect`
    static async buildTxForCollect(
        current: CrowdfundStateful,
        options: MethodCallOptions<CrowdfundStateful>
    ): Promise<ContractTransaction> {
        const defaultChangeAddress = await current.signer.getDefaultAddress()
        const unsignedTx: bsv.Transaction = new bsv.Transaction()
            // add contract input
            .addInput(current.buildContractInput(options.fromUTXO))

            // build collect output
            .addOutput(
                new bsv.Transaction.Output({
                    script: bsv.Script.fromHex(
                        Utils.buildPublicKeyHashScript(
                            hash160(current.beneficiary)
                        )
                    ),
                    satoshis: current.balance,
                })
            )
            // build change output
            .change(options.changeAddress || defaultChangeAddress)

            .setInputSequence(0, options.sequence || 0xffffffff - 1)
            .setLockTime(options.lockTime || 0)

        return {
            tx: unsignedTx,
            atInputIndex: 0,
            nexts: [],
        }
    }

    // User defined transaction builder for calling function `refund`
    static async buildTxForRefund(
        current: CrowdfundStateful,
        options: MethodCallOptions<CrowdfundStateful>,
        contributor: PubKey,
        amount: bigint
    ): Promise<ContractTransaction> {
        const defaultChangeAddress = await current.signer.getDefaultAddress()
        const balance = current.balance - Number(amount)
        const nextInstance = current.next()
        nextInstance.donor.delete(contributor)

        const unsignedTx: bsv.Transaction = new bsv.Transaction()
            // add contract input
            .addInput(current.buildContractInput(options.fromUTXO))
            // build next instance output
            .addOutput(
                new bsv.Transaction.Output({
                    script: nextInstance.lockingScript,
                    satoshis: balance,
                })
            )
            // build refund output
            .addOutput(
                new bsv.Transaction.Output({
                    script: bsv.Script.fromHex(
                        Utils.buildPublicKeyHashScript(hash160(contributor))
                    ),
                    satoshis: Number(amount),
                })
            )
            // build change output
            .change(options.changeAddress || defaultChangeAddress)

        return {
            tx: unsignedTx,
            atInputIndex: 0,
            nexts: [
                {
                    instance: nextInstance,
                    atOutputIndex: 0,
                    balance: balance,
                },
            ],
        }
    }
}
