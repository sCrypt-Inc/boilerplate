import { BSV20V2 } from 'scrypt-ord'
import {
    assert,
    ByteString,
    hash256,
    method,
    prop,
    PubKey,
    pubKey2Addr,
    sha256,
    Sha256,
    Sig,
    SmartContract,
    toByteString,
    Utils,
} from 'scrypt-ts'

export class Bsv20Loan extends BSV20V2 {
    @prop()
    lender: PubKey

    @prop()
    borrower: PubKey

    // Lent BSV-20 token amount.
    @prop()
    tokenAmt: bigint

    // Fixed interest rate of the load.
    // 1 = 1%
    @prop()
    interestRate: bigint

    // Collateral satoshis.
    @prop()
    collateral: bigint

    // Deadline of the loan.
    @prop()
    deadline: bigint

    // Flag that indicates wether the
    // loan was already taken.
    @prop(true)
    taken: boolean

    constructor(
        id: ByteString,
        sym: ByteString,
        max: bigint,
        dec: bigint,
        lender: PubKey,
        borrower: PubKey,
        tokenAmt: bigint,
        interestRate: bigint,
        collateral: bigint,
        deadline: bigint
    ) {
        super(id, sym, max, dec)
        this.init(...arguments)

        this.lender = lender
        this.borrower = borrower
        this.tokenAmt = tokenAmt
        this.interestRate = interestRate
        this.collateral = collateral
        this.deadline = deadline
        this.taken = false
    }

    @method()
    public takeLoan() {
        // Check loan isn't taken yet.
        assert(this.taken == false, 'loan already taken')
        this.taken = true

        // Pay borrower the principal, i.e. token amount locked in the contract.
        let outputs = BSV20V2.buildTransferOutput(
            pubKey2Addr(this.borrower),
            this.id,
            this.tokenAmt
        )

        // Make sure borrower deposited collateral and propagate contract.
        outputs += this.buildStateOutput(this.collateral)
        outputs += this.buildChangeOutput()
        assert(hash256(outputs) == this.ctx.hashOutputs, 'hashOutputs mismatch')
    }

    @method()
    public repay() {
        // Check loan is already taken.
        assert(this.taken == true, 'loan not taken yet')

        // Pay lender back the principal token amount plus interest.
        const interest = (this.tokenAmt * this.interestRate) / 100n
        let outputs = BSV20V2.buildTransferOutput(
            pubKey2Addr(this.lender),
            this.id,
            this.tokenAmt + interest
        )

        // Pay back borrowers collateral.
        outputs += Utils.buildAddressOutput(
            pubKey2Addr(this.borrower),
            this.collateral
        )

        outputs += this.buildChangeOutput()

        // Enforce outputs.
        assert(hash256(outputs) == this.ctx.hashOutputs, 'hashOutputs mismatch')
    }

    @method()
    public foreclose(sigLender: Sig) {
        // Check lender sig.
        assert(this.checkSig(sigLender, this.lender), 'invalid sig lender')

        // Check if deadline reached.
        assert(this.timeLock(this.deadline), 'deadline not yet reached')
    }
}
