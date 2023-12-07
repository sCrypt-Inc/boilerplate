import {
    assert,
    hash256,
    method,
    prop,
    PubKey,
    pubKey2Addr,
    Sig,
    SmartContract,
    toByteString,
    Utils,
} from 'scrypt-ts'

export class ZeroCouponBond extends SmartContract {
    @prop()
    issuer: PubKey

    @prop(true)
    investor: PubKey

    @prop(true)
    forSale: boolean

    // Price of the bond in satoshis.
    @prop(true)
    price: bigint

    @prop()
    faceValue: bigint

    @prop()
    matureTime: bigint

    constructor(
        issuer: PubKey,
        faceValue: bigint,
        price: bigint,
        matureTime: bigint
    ) {
        super(...arguments)
        this.issuer = issuer
        this.investor = PubKey(
            toByteString(
                '0000000000000000000000000000000000000000000000000000000000000000'
            )
        )
        this.faceValue = faceValue
        this.matureTime = matureTime
        this.forSale = true
        this.price = price
    }

    @method()
    public buy(newInvestor: PubKey) {
        const prevInvestor = this.investor

        // Set new investor.
        this.investor = newInvestor

        // Toggle for sale flag.
        this.forSale = false

        let outputs = toByteString('')
        const alreadyOwned =
            this.investor ==
            PubKey(
                toByteString(
                    '0000000000000000000000000000000000000000000000000000000000000000'
                )
            )
        if (alreadyOwned) {
            // Pay previous investor.
            outputs += this.buildStateOutput(this.ctx.utxo.value)
            outputs += Utils.buildAddressOutput(
                pubKey2Addr(prevInvestor),
                this.price
            )
        } else {
            // Deposit to contract.
            outputs += this.buildStateOutput(this.ctx.utxo.value + this.price)
        }

        // Enforce outputs.
        outputs += this.buildChangeOutput()
        assert(hash256(outputs) == this.ctx.hashOutputs, 'hashOutputs mismatch')
    }

    @method()
    public mature(issuerSig: Sig) {
        // Check issuer signature.
        assert(this.checkSig(issuerSig, this.issuer), 'invalid sig issuer')

        // Check mature time passed.
        assert(this.timeLock(this.matureTime), 'bond not matured')

        // Ensure investor gets payed face value of the bond.
        let outputs = Utils.buildAddressOutput(
            pubKey2Addr(this.investor),
            this.faceValue
        )
        outputs += this.buildChangeOutput()
        assert(hash256(outputs) == this.ctx.hashOutputs, 'hashOutputs mismatch')
    }

    @method()
    public listForSale(price: bigint, investorSig: Sig) {
        // Check investor signature.
        assert(
            this.checkSig(investorSig, this.investor),
            'invalid sig investor'
        )

        // Set price and toggle for sale flag.
        this.price = price
        this.forSale = true

        // Propagate contract.
        let outputs = this.buildStateOutput(this.ctx.utxo.value)
        outputs += this.buildChangeOutput()
        assert(hash256(outputs) == this.ctx.hashOutputs, 'hashOutputs mismatch')
    }

    @method()
    public cancelSale(investorSig: Sig) {
        // Check investor signature.
        assert(
            this.checkSig(investorSig, this.investor),
            'invalid sig investor'
        )

        // Toggle for sale flag.
        this.forSale = false

        // Propagate contract.
        let outputs = this.buildStateOutput(this.ctx.utxo.value)
        outputs += this.buildChangeOutput()
        assert(hash256(outputs) == this.ctx.hashOutputs, 'hashOutputs mismatch')
    }

    @method()
    public default(investorSig: Sig) {
        // After default deadline is reached the investor can
        // take everything locked within the smart contract...

        // Check investor signature.
        assert(
            this.checkSig(investorSig, this.investor),
            'invalid sig investor'
        )

        // Check mature time + ~14 days.
        assert(
            this.timeLock(this.matureTime + 20160n),
            'deadline for default not reached'
        )
    }
}
