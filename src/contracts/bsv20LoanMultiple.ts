import { BSV20V2 } from 'scrypt-ord'
import {
    assert,
    ByteString,
    byteString2Int,
    Constants,
    fill,
    FixedArray,
    hash256,
    method,
    prop,
    PubKey,
    pubKey2Addr,
    Sha256,
    Sig,
    slice,
    toByteString,
    Utils,
} from 'scrypt-ts'
import {
    Blockchain,
    BlockHeader,
    MerkleProof,
    RabinPubKey,
    RabinSig,
    RabinVerifier,
} from 'scrypt-ts-lib'

export type Borrower = {
    emptySlot: boolean
    approved: boolean
    pubKey: PubKey
    amt: bigint
    deadline: bigint
}

export class Bsv20LoanMultiple extends BSV20V2 {
    static readonly N_BORROWERS = 10

    @prop()
    lender: PubKey

    @prop(true)
    borrowers: FixedArray<Borrower, typeof Bsv20LoanMultiple.N_BORROWERS>

    // Fixed interest rate of the loan.
    // 1 = 1%
    @prop()
    interestRate: bigint

    // Collateral per token in satoshis.
    @prop()
    collateralPerToken: bigint

    @prop()
    oraclePubKey: RabinPubKey

    @prop()
    minBHTarget: bigint

    constructor(
        id: ByteString,
        sym: ByteString,
        max: bigint,
        dec: bigint,
        lender: PubKey,
        interestRate: bigint,
        collateralPerToken: bigint,
        oraclePubKey: RabinPubKey,
        minBHTarget: bigint
    ) {
        super(id, sym, max, dec)
        this.init(...arguments)

        this.lender = lender
        this.borrowers = fill(
            {
                emptySlot: true,
                approved: false,
                pubKey: PubKey(
                    toByteString(
                        '000000000000000000000000000000000000000000000000'
                    )
                ),
                amt: 0n,
                deadline: 0n,
            } as Borrower,
            10
        )
        this.interestRate = interestRate
        this.collateralPerToken = collateralPerToken
        this.oraclePubKey = oraclePubKey
        this.minBHTarget = minBHTarget
    }

    @method()
    public requestLoan(
        slotIdx: bigint,
        amt: bigint,
        borrowerPubKey: PubKey,
        borrowerSig: Sig
    ) {
        // Check slot index is empty.
        const borrower = this.borrowers[Number(slotIdx)]
        assert(borrower.emptySlot, 'slot is not empty')

        // Check borrower sig.
        assert(
            this.checkSig(borrowerSig, borrowerPubKey),
            'invalid sig borrower'
        )

        // Add to borrowers array.
        this.borrowers[Number(slotIdx)] = {
            emptySlot: false,
            approved: false,
            pubKey: borrowerPubKey,
            amt: amt,
            deadline: 0n,
        }

        // Ensure that borrower deposited collateral
        // and propagate contract.
        const collateral = this.collateralPerToken * amt
        let outputs = this.buildStateOutput(this.ctx.utxo.value + collateral)
        outputs += this.buildChangeOutput()
        assert(hash256(outputs) == this.ctx.hashOutputs, 'hashOutputs mismatch')
    }

    @method()
    public cancelRequest(slotIdx: bigint, borrowerSig: Sig) {
        // Check slot index is not empty and not yet approved.
        const borrower = this.borrowers[Number(slotIdx)]
        assert(!borrower.emptySlot, 'slot is empty')
        assert(!borrower.approved, 'request was already approved')

        // Check borrower sig.
        assert(
            this.checkSig(borrowerSig, borrower.pubKey),
            'invalid sig borrower'
        )

        // Mark slot empty.
        this.borrowers[Number(slotIdx)].emptySlot = true

        // Ensure that borrower gets back the collateral
        // and propagate contract.
        const collateral = this.collateralPerToken * borrower.amt
        let outputs = this.buildStateOutput(this.ctx.utxo.value - collateral)

        outputs += Utils.buildAddressOutput(
            pubKey2Addr(borrower.pubKey),
            collateral
        )

        outputs += this.buildChangeOutput()

        // Enforce outputs.
        assert(hash256(outputs) == this.ctx.hashOutputs, 'hashOutputs mismatch')
    }

    @method()
    public approveLoan(
        slotIdx: bigint,
        oracleMsg: ByteString,
        oracleSig: RabinSig,
        merkleProof: MerkleProof,
        blockHeader: BlockHeader,
        lenderSig: Sig
    ) {
        // Check slot index is not empty and not yet approved.
        const borrower = this.borrowers[Number(slotIdx)]
        assert(!borrower.emptySlot, 'slot is empty')
        assert(!borrower.approved, 'request was already approved')

        // Check lender sig.
        assert(this.checkSig(lenderSig, this.lender), 'invalid sig lender')

        // Check merkle proof.
        const prevTxid = Sha256(this.ctx.utxo.outpoint.txid)
        assert(
            Blockchain.isValidBlockHeader(blockHeader, this.minBHTarget),
            'BH does not meet min target'
        )
        assert(
            Blockchain.txInBlock(prevTxid, blockHeader, merkleProof, 32),
            'invalid Merkle proof'
        )

        // Mark slot approved and set deadline.
        // Get block-height via block header.
        this.borrowers[Number(slotIdx)] = {
            emptySlot: false,
            approved: true,
            pubKey: borrower.pubKey,
            amt: borrower.amt,
            deadline: blockHeader.time + 52560n, // ~ 1 year
        }

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
        assert(utxoTokenAmt == borrower.amt, 'invalid token amount')

        // Construct next instance of contract.
        let outputs = this.buildStateOutput(this.ctx.utxo.value)

        // Pay borrower the token amount.
        outputs += BSV20V2.buildTransferOutput(
            pubKey2Addr(this.lender),
            this.id,
            borrower.amt
        )

        outputs += this.buildChangeOutput()

        // Enforce outputs.
        assert(hash256(outputs) == this.ctx.hashOutputs, 'hashOutputs mismatch')
    }

    @method()
    public repay(
        slotIdx: bigint,
        oracleMsg: ByteString,
        oracleSig: RabinSig,
        borrowerSig: Sig
    ) {
        // Check slot index is not empty and approved.
        const borrower = this.borrowers[Number(slotIdx)]
        assert(!borrower.emptySlot, 'slot is empty')
        assert(borrower.approved, 'borrow request not approved')

        // Check borrower sig.
        assert(
            this.checkSig(borrowerSig, borrower.pubKey),
            'invalid sig for borrower'
        )

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
        assert(utxoTokenAmt == borrower.amt, 'invalid token amount')

        // Construct next instance of contract.
        const collateral = this.collateralPerToken * utxoTokenAmt
        let outputs = this.buildStateOutput(this.ctx.utxo.value - collateral)

        // Pay lender back the owed amount.
        const interest = (borrower.amt * this.interestRate) / 100n
        outputs += BSV20V2.buildTransferOutput(
            pubKey2Addr(this.lender),
            this.id,
            borrower.amt + interest
        )

        // Pay back borrowers collateral.
        outputs += Utils.buildAddressOutput(
            pubKey2Addr(borrower.pubKey),
            collateral
        )

        outputs += this.buildChangeOutput()

        // Enforce outputs.
        assert(hash256(outputs) == this.ctx.hashOutputs, 'hashOutputs mismatch')
    }

    @method()
    public foreclose(slotIdx: bigint, lenderSig: Sig) {
        // Check slot index is not empty and approved.
        const borrower = this.borrowers[Number(slotIdx)]
        assert(!borrower.emptySlot, 'slot is empty')
        assert(borrower.approved, 'borrow request not approved')

        // Check lender sig.
        assert(this.checkSig(lenderSig, this.lender), 'invalid sig lender')

        // Check if deadline reached.
        assert(this.timeLock(borrower.deadline), 'deadline not yet reached')

        // Construct next instance of contract.
        const collateral = this.collateralPerToken * borrower.amt
        let outputs = this.buildStateOutput(this.ctx.utxo.value - collateral)

        // Pay lender the borrowers collateral.
        outputs += Utils.buildAddressOutput(
            pubKey2Addr(borrower.pubKey),
            collateral
        )

        outputs += this.buildChangeOutput()

        // Enforce outputs.
        assert(hash256(outputs) == this.ctx.hashOutputs, 'hashOutputs mismatch')
    }
}
