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

export type PoolLender = {
    emptySlot: boolean
    pubKey: PubKey
    amt: bigint
    deadline: bigint
}

export type PoolBorrower = {
    emptySlot: boolean
    pubKey: PubKey
    amt: bigint
    deadline: bigint
}

export class Bsv20LendingPool extends BSV20V2 {
    static readonly N_LENDERS = 10
    static readonly N_BORROWERS = 10

    @prop(true)
    lenders: FixedArray<PoolLender, typeof Bsv20LendingPool.N_BORROWERS>

    @prop(true)
    borrowers: FixedArray<PoolBorrower, typeof Bsv20LendingPool.N_BORROWERS>

    // Fixed interest rate of the loan.
    // 1 = 1%
    @prop()
    interestRate: bigint

    // Collateral per token in satoshis.
    @prop()
    collateralPerToken: bigint

    @prop(true)
    tokenDeposits: bigint

    @prop(true)
    collateralDeposits: bigint

    @prop()
    collateralContractScript: ByteString

    @prop()
    oraclePubKey: RabinPubKey

    @prop()
    minBHTarget: bigint

    constructor(
        id: ByteString,
        sym: ByteString,
        max: bigint,
        dec: bigint,
        interestRate: bigint,
        collateralPerToken: bigint,
        collateralContractScript: ByteString,
        oraclePubKey: RabinPubKey,
        minBHTarget: bigint
    ) {
        super(id, sym, max, dec)
        this.init(...arguments)

        this.lenders = fill(
            {
                emptySlot: true,
                pubKey: PubKey(
                    toByteString(
                        '000000000000000000000000000000000000000000000000'
                    )
                ),
                amt: 0n,
                deadline: 0n,
            },
            10
        )
        this.borrowers = fill(
            {
                emptySlot: true,
                pubKey: PubKey(
                    toByteString(
                        '000000000000000000000000000000000000000000000000'
                    )
                ),
                amt: 0n,
                deadline: 0n,
            },
            10
        )
        this.interestRate = interestRate
        this.collateralPerToken = collateralPerToken
        this.collateralContractScript = collateralContractScript
        this.tokenDeposits = 0n
        this.collateralDeposits = 0n
        this.oraclePubKey = oraclePubKey
        this.minBHTarget = minBHTarget
    }

    @method()
    public deposit(
        slotIdx: bigint,
        lenderPubKey: PubKey,
        amt: bigint,
        oracleMsg: ByteString,
        oracleSig: RabinSig,
        merkleProof: MerkleProof,
        blockHeader: BlockHeader
    ) {
        // Check slot index is empty.
        const lender = this.lenders[Number(slotIdx)]
        assert(lender.emptySlot, 'slot is not empty')

        // Make sure second input spends collateral holding contract.
        const prevTxId = this.ctx.utxo.outpoint.txid
        const prevoutCollateralContract = slice(
            this.prevouts,
            Constants.OutpointLen,
            Constants.OutpointLen * 2n
        )
        assert(
            slice(prevoutCollateralContract, 0n, Constants.TxIdLen) == prevTxId
        )
        assert(
            byteString2Int(
                slice(
                    prevoutCollateralContract,
                    Constants.TxIdLen,
                    Constants.OutpointLen
                )
            ) == 1n
        )

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

        // Store lender and set deadline.
        // Get block-height via block header.
        this.lenders[Number(slotIdx)] = {
            emptySlot: false,
            pubKey: lenderPubKey,
            amt: amt,
            deadline: blockHeader.time + 52560n, // ~ 1 year
        }

        // Add amount to token deposits.
        this.tokenDeposits += amt

        // Check oracle signature.
        assert(
            RabinVerifier.verifySig(oracleMsg, oracleSig, this.oraclePubKey),
            'oracle sig verify failed'
        )

        // Check that we're unlocking the UTXO specified in the oracles message.
        assert(
            slice(this.prevouts, Constants.OutpointLen * 2n, 108n) ==
                slice(oracleMsg, 0n, Constants.OutpointLen),
            'third input is not spending specified ordinal UTXO'
        )

        // Get token amount held by the UTXO from oracle message.
        const utxoTokenAmt = byteString2Int(
            slice(oracleMsg, Constants.OutpointLen, 44n)
        )

        // Check token amount is correct.
        assert(utxoTokenAmt == amt, 'invalid token amount')

        // Construct next instance of contract.
        let outputs = this.buildStateOutputFT(this.tokenDeposits)

        // Construct next instance of collateral holding contract.
        outputs += Utils.buildOutput(
            this.collateralContractScript,
            this.collateralDeposits
        )

        outputs += this.buildChangeOutput()

        // Enforce outputs.
        assert(hash256(outputs) == this.ctx.hashOutputs, 'hashOutputs mismatch')
    }

    @method()
    public withdraw(slotIdx: bigint, lenderSig: Sig) {
        // Check slot index is not empty.
        const lender = this.lenders[Number(slotIdx)]
        assert(!lender.emptySlot, 'slot is empty')

        // Check lender signature.
        assert(this.checkSig(lenderSig, lender.pubKey), 'invalid sig lender')

        // Update token deposits.
        const interest = (lender.amt * this.interestRate) / 100n
        this.tokenDeposits -= lender.amt - interest

        // Construct next instance of contract.
        let outputs = this.buildStateOutputFT(this.tokenDeposits)

        // Construct next instance of collateral holding contract.
        outputs += Utils.buildOutput(
            this.collateralContractScript,
            this.collateralDeposits
        )

        // Pay lender the owed amount.
        outputs += BSV20V2.buildTransferOutput(
            pubKey2Addr(lender.pubKey),
            this.id,
            lender.amt + interest
        )

        outputs += this.buildChangeOutput()

        // Enforce outputs.
        assert(hash256(outputs) == this.ctx.hashOutputs, 'hashOutputs mismatch')
    }

    @method()
    public borrow(
        slotIdx: bigint,
        amt: bigint,
        borrowerPubKey: PubKey,
        borrowerSig: Sig,
        merkleProof: MerkleProof,
        blockHeader: BlockHeader
    ) {
        // Check slot index is empty.
        const borrower = this.borrowers[Number(slotIdx)]
        assert(!borrower.emptySlot, 'slot is not empty')

        // Check borrower sig.
        assert(
            this.checkSig(borrowerSig, borrowerPubKey),
            'invalid sig borrower'
        )

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

        // Add to borrowers array.
        this.borrowers[Number(slotIdx)] = {
            emptySlot: false,
            pubKey: borrowerPubKey,
            amt: amt,
            deadline: blockHeader.time + 52560n, // ~ 1 year
        }

        // Update deposits.
        this.tokenDeposits -= amt
        this.collateralDeposits += amt + this.collateralPerToken

        // Construct next instance of contract.
        let outputs = this.buildStateOutputFT(this.tokenDeposits)

        // Construct next instance of collateral holding contract.
        outputs += Utils.buildOutput(
            this.collateralContractScript,
            this.collateralDeposits
        )

        // Pay borrower the borrowed token amount.
        outputs += BSV20V2.buildTransferOutput(
            pubKey2Addr(borrowerPubKey),
            this.id,
            amt
        )

        outputs += this.buildChangeOutput()

        // Enforce outputs.
        assert(hash256(outputs) == this.ctx.hashOutputs, 'hashOutputs mismatch')
    }

    @method()
    public repay(
        slotIdx: bigint,
        borrowerSig: Sig,
        oracleMsg: ByteString,
        oracleSig: RabinSig
    ) {
        // Check slot index is not empty.
        const borrower = this.borrowers[Number(slotIdx)]
        assert(!borrower.emptySlot, 'slot is empty')

        // Check borrower sig.
        assert(
            this.checkSig(borrowerSig, borrower.pubKey),
            'invalid sig borrower'
        )

        // Check oracle signature.
        assert(
            RabinVerifier.verifySig(oracleMsg, oracleSig, this.oraclePubKey),
            'oracle sig verify failed'
        )

        // Check that we're unlocking the UTXO specified in the oracles message.
        assert(
            slice(this.prevouts, Constants.OutpointLen * 2n, 108n) ==
                slice(oracleMsg, 0n, Constants.OutpointLen),
            'third input is not spending specified ordinal UTXO'
        )

        // Get token amount held by the UTXO from oracle message.
        const utxoTokenAmt = byteString2Int(
            slice(oracleMsg, Constants.OutpointLen, 44n)
        )

        // Check token amount is correct.
        const interest = (borrower.amt * this.interestRate) / 100n
        assert(utxoTokenAmt == borrower.amt + interest, 'invalid token amount')

        // Update deposits.
        this.tokenDeposits += borrower.amt + interest
        this.collateralDeposits -= borrower.amt * this.collateralPerToken

        // Construct next instance of contract.
        let outputs = this.buildStateOutputFT(this.tokenDeposits)

        // Construct next instance of collateral holding contract.
        outputs += Utils.buildOutput(
            this.collateralContractScript,
            this.collateralDeposits
        )

        // Pay borrower back his collateral.
        outputs += Utils.buildAddressOutput(
            pubKey2Addr(borrower.pubKey),
            borrower.amt * this.collateralPerToken
        )

        outputs += this.buildChangeOutput()

        // Enforce outputs.
        assert(hash256(outputs) == this.ctx.hashOutputs, 'hashOutputs mismatch')
    }

    @method()
    public pastDue(slotIdx: bigint) {
        // Check slot index is not empty.
        const borrower = this.borrowers[Number(slotIdx)]
        assert(!borrower.emptySlot, 'slot is empty')

        // Check if past due.
        assert(this.timeLock(borrower.deadline), 'not past due yet')

        // Mark slot empty.
        this.borrowers[Number(slotIdx)] = {
            emptySlot: true,
            pubKey: PubKey(
                toByteString('000000000000000000000000000000000000000000000000')
            ),
            amt: 0n,
            deadline: 0n,
        }

        // Update collateral amt.
        const collateral = borrower.amt * this.collateralPerToken
        this.collateralDeposits -= collateral
        // Construct next instance of contract.
        let outputs = this.buildStateOutputFT(this.tokenDeposits)

        // Construct next instance of collateral holding contract.
        outputs += Utils.buildOutput(
            this.collateralContractScript,
            this.collateralDeposits
        )

        // Pay each lender his share.
        let totalAmt = 0n
        for (let i = 0; i < Bsv20LendingPool.N_LENDERS; i++) {
            const lender = this.lenders[i]
            if (!lender.emptySlot) {
                totalAmt += lender.amt
            }
        }
        for (let i = 0; i < Bsv20LendingPool.N_LENDERS; i++) {
            const lender = this.lenders[i]
            if (!lender.emptySlot) {
                outputs += Utils.buildAddressOutput(
                    pubKey2Addr(lender.pubKey),
                    (lender.amt / totalAmt) * collateral
                )
            }
        }

        outputs += this.buildChangeOutput()

        // Enforce outputs.
        assert(hash256(outputs) == this.ctx.hashOutputs, 'hashOutputs mismatch')
    }
}
