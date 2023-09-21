import {
    assert,
    hash160,
    hash256,
    HashedMap,
    method,
    prop,
    PubKey,
    Sig,
    SmartContract,
    Utils,
    MethodCallOptions,
    ContractTransaction,
    bsv,
} from 'scrypt-ts'

/*
 * Read Medium article about this contract
 * https://xiaohuiliu.medium.com/crowdfunding-on-bitcoin-169c1f8b6b63
 */

export type Donators = HashedMap<PubKey, bigint>

export class CrowdfundReplay extends SmartContract {
    @prop()
    readonly beneficiary: PubKey

    @prop(true)
    donators: Donators

    @prop()
    readonly deadline: bigint

    @prop()
    readonly target: bigint

    constructor(
        beneficiary: PubKey,
        donators: Donators,
        deadline: bigint,
        target: bigint
    ) {
        super(...arguments)
        this.beneficiary = beneficiary
        this.donators = donators
        this.deadline = deadline
        this.target = target
    }

    @method()
    public donate(donator: PubKey, amount: bigint) {
        // donation amount is greater than zero
        assert(amount > 0n, 'donation amount should be greater than 0')

        // can only donate once
        assert(!this.donators.has(donator), 'donator already presents')

        this.donators.set(donator, amount)

        // confine outputs
        const outputs =
            this.buildStateOutput(this.ctx.utxo.value + amount) +
            this.buildChangeOutput()
        assert(hash256(outputs) == this.ctx.hashOutputs, 'hashOutputs mismatch')
    }

    // donators can be refunded at any time
    @method()
    public refund(donator: PubKey, amount: bigint, sig: Sig) {
        // checking the validity of the signature
        assert(this.checkSig(sig, donator), 'donator signature check failed')

        // whether donated before
        assert(this.donators.canGet(donator, amount), 'not donated before')

        // remove the donator
        assert(this.donators.delete(donator), 'remove donator failed')

        // confine outputs
        const outputs =
            this.buildStateOutput(this.ctx.utxo.value - amount) +
            Utils.buildPublicKeyHashOutput(hash160(donator), amount) +
            this.buildChangeOutput()
        assert(hash256(outputs) == this.ctx.hashOutputs, 'hashOutput mismatch')
    }

    // collect pledged fund
    @method()
    public collect(sig: Sig) {
        const amount = this.ctx.utxo.value
        // ensure the collected amount actually reaches the target.
        assert(amount >= this.target, 'cannot collect without target reached')

        // Check deadline.
        assert(
            this.timeLock(this.deadline),
            'cannot collet before fundraising expired'
        )

        // validate signature of beneficiary
        assert(
            this.checkSig(sig, this.beneficiary),
            'beneficiary signature check failed'
        )

        // confine outputs
        const outputs =
            Utils.buildPublicKeyHashOutput(hash160(this.beneficiary), amount) +
            this.buildChangeOutput()

        assert(hash256(outputs) == this.ctx.hashOutputs, 'hashOutputs mismatch')
    }

    static async buildTxForRefund(
        current: CrowdfundReplay,
        options: MethodCallOptions<CrowdfundReplay>,
        donator: PubKey,
        amount: bigint
    ): Promise<ContractTransaction> {
        const defaultChangeAddress = await current.signer.getDefaultAddress()
        const balance = current.balance - Number(amount)

        const nextInstance = current.next()
        nextInstance.applyOffchainUpdatesForRefund(donator)

        const unsignedTx = new bsv.Transaction()
            .addInput(current.buildContractInput(options.fromUTXO))
            .addOutput(
                new bsv.Transaction.Output({
                    script: nextInstance.lockingScript,
                    satoshis: balance,
                })
            )
            .addOutput(
                new bsv.Transaction.Output({
                    script: bsv.Script.fromHex(
                        Utils.buildPublicKeyHashScript(hash160(donator))
                    ),
                    satoshis: Number(amount),
                })
            )
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

    static async buildTxForCollect(
        current: CrowdfundReplay,
        options: MethodCallOptions<CrowdfundReplay>
    ): Promise<ContractTransaction> {
        const defaultChangeAddress = await current.signer.getDefaultAddress()

        const unsignedTx = new bsv.Transaction()
            .addInput(current.buildContractInput(options.fromUTXO))
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
            .change(options.changeAddress || defaultChangeAddress)
            .setInputSequence(0, options.sequence || 0xffffffff - 1)
            .setLockTime(options.lockTime || 0)

        return {
            tx: unsignedTx,
            atInputIndex: 0,
            nexts: [],
        }
    }

    // methods for updating @prop(true) offchain
    //
    // when replay contract instance to the latest states
    // those method names MUST follow the pattern `applyOffchainUpdatesForXxx`
    // where `Xxx` is the name of the corresponding public method with first letter capitalized

    applyOffchainUpdatesForDonate(donator: PubKey, amount: bigint) {
        this.donators.set(donator, amount)
    }

    applyOffchainUpdatesForRefund(donator: PubKey) {
        this.donators.delete(donator)
    }
}
