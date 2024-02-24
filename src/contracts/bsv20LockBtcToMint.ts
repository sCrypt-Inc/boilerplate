import { BSV20V2, Ordinal } from 'scrypt-ord'
import {
    Addr,
    assert,
    bsv,
    ByteString,
    ContractTransaction,
    FixedArray,
    hash256,
    HashedSet,
    int2ByteString,
    method,
    MethodCallOptions,
    prop,
    PubKey,
    sha256,
    slice,
    toByteString,
    Utils,
} from 'scrypt-ts'
import { Blockchain, BlockHeader, MerklePath, MerkleProof } from 'scrypt-ts-lib'

export type Bsv20LockBtcToMint_VarIntRes = {
    val: bigint
    newIdx: bigint
}

export class Bsv20LockBtcToMint extends BSV20V2 {
    static readonly MIN_CONF = 3
    static readonly BTC_MAX_INPUTS = 3

    @prop(true)
    supply: bigint

    // Amount of sats (BTC) to lock up in order to mint a single token.
    @prop()
    hodlRate: bigint

    // Time until which the BTC needs to be locked in order to mint.
    @prop()
    hodlDeadline: bigint

    @prop()
    targetDifficulty: bigint

    @prop(true)
    usedLockPubKeys: HashedSet<PubKey>

    constructor(
        id: ByteString,
        sym: ByteString,
        max: bigint,
        dec: bigint,
        supply: bigint,
        hodlRate: bigint,
        hodlDeadline: bigint,
        targetDifficulty: bigint,
        usedLockPubKeys: HashedSet<PubKey>
    ) {
        super(id, sym, max, dec)
        this.init(...arguments)

        this.supply = supply
        this.hodlRate = hodlRate
        this.hodlDeadline = hodlDeadline
        this.targetDifficulty = targetDifficulty
        this.usedLockPubKeys = usedLockPubKeys
    }

    @method()
    public mint(
        ordinalAddress: Addr,
        lockPubKey: PubKey,
        amount: bigint,
        btcTx: ByteString,
        merkleProof: MerkleProof,
        headers: FixedArray<BlockHeader, typeof Bsv20LockBtcToMint.MIN_CONF>
    ) {
        // Check lock public key was not yet used. This is to avoid replay
        // attacks where the same BTC tx would be used to mint multiple times.
        assert(
            !this.usedLockPubKeys.has(lockPubKey),
            'lock pub key already used'
        )
        this.usedLockPubKeys.add(lockPubKey)

        let outputs = toByteString('')
        let transferAmt = amount

        if (this.supply > transferAmt) {
            // If there are still tokens left, then update supply and
            // build state output inscribed with leftover tokens.
            this.supply -= transferAmt
            outputs += this.buildStateOutputFT(this.supply)
        } else {
            // If not, then transfer all the remaining supply.
            transferAmt = this.supply
        }

        // Check btc tx.
        this.checkBtcTx(btcTx, lockPubKey, transferAmt * this.hodlRate)

        // Calc merkle root.
        const txID = hash256(btcTx)
        const merkleRoot = MerklePath.calcMerkleRoot(txID, merkleProof, 32)

        // Check if merkle root is included in the first BH.
        assert(
            merkleRoot == headers[0].merkleRoot,
            "Merkle root of proof doesn't match the one in the BH."
        )

        // Check target diff for headers.
        for (let i = 0; i < Bsv20LockBtcToMint.MIN_CONF; i++) {
            assert(
                Blockchain.isValidBlockHeader(
                    headers[i],
                    this.targetDifficulty
                ),
                `${i}-nth BH doesn't meet target difficulty`
            )
        }

        // Check header chain.
        let h = Blockchain.blockHeaderHash(headers[0])
        for (let i = 0; i < Bsv20LockBtcToMint.MIN_CONF; i++) {
            if (i >= 1n) {
                const header = headers[i]
                // Check if prev block hash matches.
                assert(
                    header.prevBlockHash == h,
                    `${i}-th BH wrong prevBlockHash`
                )
                // Update header hash.
                h = Blockchain.blockHeaderHash(header)
            }
        }

        // Build FT P2PKH output paying specified amount of tokens.
        outputs += BSV20V2.buildTransferOutput(
            ordinalAddress,
            this.id,
            transferAmt
        )

        // Build change output.
        outputs += this.buildChangeOutput()

        assert(hash256(outputs) == this.ctx.hashOutputs, 'hashOutputs mismatch')
    }

    @method()
    checkBtcTx(btcTx: ByteString, lockPubKey: PubKey, amount: bigint): void {
        // Most things should be the same as in BSV except the witness data and flag.
        // - Check (first) output is a P2WSH to a time-lock script with the specified lock address.
        // - Check (first) output amount is correct.

        let idx = 4n

        // Make sure to serialize BTC tx without witness data.
        // See https://github.com/karask/python-bitcoin-utils/blob/a41c7a1e546985b759e6eb2ae4524f466be809ca/bitcoinutils/transactions.py#L913
        assert(
            slice(btcTx, idx, idx + 2n) != toByteString('0001'),
            'Witness data present. Please serialize without witness data.'
        )

        //// INPUTS:
        const inLen = Bsv20LockBtcToMint.parseVarInt(btcTx, idx)
        assert(
            inLen.val <= BigInt(Bsv20LockBtcToMint.BTC_MAX_INPUTS),
            'Number of inputs too large.'
        )
        idx = inLen.newIdx
        for (let i = 0n; i < Bsv20LockBtcToMint.BTC_MAX_INPUTS; i++) {
            if (i < inLen.val) {
                //const prevTxID = slice(btcTx, idx, idx + 32n)
                idx += 32n
                //const outIdx = slice(btcTx, idx, idx + 4n)
                idx += 4n
                const scriptLen = Bsv20LockBtcToMint.parseVarInt(btcTx, idx)
                idx = scriptLen.newIdx
                idx += scriptLen.val
                //const nSequence = slice(btcTx, idx, idx + 4n)
                idx += 4n
            }
        }

        //// FIRST OUTPUT:
        // Check first outputs amount is correct and that it's a P2WSH to the correct time-lock script.
        const outLen = Bsv20LockBtcToMint.parseVarInt(btcTx, idx)
        idx = outLen.newIdx
        const outAmt = Utils.fromLEUnsigned(slice(btcTx, idx, idx + 8n))
        assert(outAmt == amount, 'output amount invalid')
        idx += 8n
        const scriptLen = Bsv20LockBtcToMint.parseVarInt(btcTx, idx)
        idx = scriptLen.newIdx
        const script = slice(btcTx, idx, idx + scriptLen.val)

        // <nLocktime> OP_CLTV OP_DROP <lockPubKey> OP_CHECKSIG
        const witnessScript =
            toByteString('04') +
            int2ByteString(this.hodlDeadline, 4n) +
            toByteString('b17521') +
            lockPubKey +
            toByteString('ac')
        const expectedP2WSHScript = toByteString('0020') + sha256(witnessScript)
        assert(script == expectedP2WSHScript, 'P2WSH script invalid')

        // Data past this point is not relevant in our use-case.
    }

    @method()
    static parseVarInt(
        btcTx: ByteString,
        idx: bigint
    ): Bsv20LockBtcToMint_VarIntRes {
        let res: Bsv20LockBtcToMint_VarIntRes = {
            val: 0n,
            newIdx: idx, // In case its 0x00, just continue from this index on.
        }
        const first = Utils.fromLEUnsigned(slice(btcTx, idx, idx + 1n))
        if (first < 0xfdn) {
            res = {
                val: first,
                newIdx: idx + 1n,
            }
        } else if (first == 0xfdn) {
            res = {
                val: Utils.fromLEUnsigned(slice(btcTx, idx + 1n, idx + 3n)),
                newIdx: idx + 3n,
            }
        } else if (first == 0xfen) {
            res = {
                val: Utils.fromLEUnsigned(slice(btcTx, idx + 1n, idx + 5n)),
                newIdx: idx + 5n,
            }
        } else if (first == 0xffn) {
            res = {
                val: Utils.fromLEUnsigned(slice(btcTx, idx + 1n, idx + 9n)),
                newIdx: idx + 9n,
            }
        }
        return res
    }

    static async mintTxBuilder(
        current: Bsv20LockBtcToMint,
        options: MethodCallOptions<Bsv20LockBtcToMint>,
        ordinalAddress: Addr,
        lockPubKey: PubKey,
        amount: bigint,
        btcTx: ByteString,
        merkleProof: MerkleProof,
        headers: FixedArray<BlockHeader, typeof Bsv20LockBtcToMint.MIN_CONF>
    ): Promise<ContractTransaction> {
        const defaultAddress = await current.signer.getDefaultAddress()

        const next = current.next()
        next.usedLockPubKeys.add(lockPubKey)
        next.supply = current.supply - amount

        if (current.isGenesis()) {
            next.id =
                Ordinal.txId2str(
                    Buffer.from(current.utxo.txId, 'hex')
                        .reverse()
                        .toString('hex')
                ) +
                toByteString('_', true) +
                Ordinal.int2Str(BigInt(current.utxo.outputIndex))
        }

        const tx = new bsv.Transaction().addInput(current.buildContractInput())

        if (next.supply > 0n) {
            const stateScript =
                BSV20V2.createTransferInsciption(next.id, next.supply) +
                Ordinal.removeInsciption(next.getStateScript())

            const stateOutput = Utils.buildOutput(stateScript, 1n)
            tx.addOutput(
                bsv.Transaction.Output.fromBufferReader(
                    new bsv.encoding.BufferReader(
                        Buffer.from(stateOutput, 'hex')
                    )
                )
            )
        }
        const rewardOutput = Bsv20LockBtcToMint.buildTransferOutput(
            ordinalAddress,
            next.id,
            amount
        )
        tx.addOutput(
            bsv.Transaction.Output.fromBufferReader(
                new bsv.encoding.BufferReader(Buffer.from(rewardOutput, 'hex'))
            )
        )

        tx.change(options.changeAddress || defaultAddress)
        return { tx, atInputIndex: 0, nexts: [] }
    }
}
