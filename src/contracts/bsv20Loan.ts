import { BSV20V2 } from 'scrypt-ord'
import {
    assert,
    ByteString,
    byteString2Int,
    Constants,
    hash256,
    method,
    prop,
    PubKey,
    pubKey2Addr,
    Sig,
    slice,
    Utils,
} from 'scrypt-ts'
import { RabinPubKey, RabinSig, RabinVerifier } from 'scrypt-ts-lib'

export class Bsv20Loan extends BSV20V2 {
    @prop()
    lender: PubKey

    @prop()
    borrower: PubKey

    // Lent BSV-20 token amount.
    @prop()
    tokenAmt: bigint

    // Fixed interest rate of the loan.
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

    @prop()
    oraclePubKey: RabinPubKey

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
        deadline: bigint,
        oraclePubKey: RabinPubKey
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
        this.oraclePubKey = oraclePubKey
    }

    @method()
    public borrow() {
        // Check loan isn't taken yet.
        assert(!this.taken, 'loan already taken')
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
    public repay(oracleMsg: ByteString, oracleSig: RabinSig) {
        // Check loan is already taken.
        assert(this.taken, 'loan not taken yet')

        // Check oracle signature.
        assert(
            RabinVerifier.verifySig(oracleMsg, oracleSig, this.oraclePubKey),
            'oracle sig verify failed'
        )

        // Check that we're unlocking the UTXO specified in the oracles message.
        assert(
            slice(
                this.prevouts,
                Constants.OutpointLen,
                Constants.OutpointLen * 2n
            ) == slice(oracleMsg, 0n, Constants.OutpointLen),
            'second input is not spending specified ordinal UTXO'
        )

        // Get token amount held by the UTXO from oracle message.
        const utxoTokenAmt = byteString2Int(
            slice(oracleMsg, Constants.OutpointLen, 44n)
        )

        // Check token amount is correct.
        const interest = (this.tokenAmt * this.interestRate) / 100n
        assert(utxoTokenAmt == this.tokenAmt + interest, 'invalid token amount')

        // Pay lender back the principal token amount plus interest.
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
