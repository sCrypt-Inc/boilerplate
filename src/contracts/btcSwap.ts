import {
    assert,
    ByteString,
    FixedArray,
    hash256,
    len,
    method,
    prop,
    PubKey,
    Addr,
    Sig,
    slice,
    SmartContract,
    toByteString,
    Utils,
    pubKey2Addr,
} from 'scrypt-ts'
import { Blockchain, MerklePath, MerkleProof, BlockHeader } from 'scrypt-ts-lib'

export type VarIntRes = {
    val: bigint
    newIdx: bigint
}

export class BTCSwap extends SmartContract {
    static readonly MIN_CONF = 3
    static readonly BTC_MAX_INPUTS = 3

    @prop()
    readonly aliceAddr: Addr

    @prop()
    readonly bobAddr: Addr

    @prop()
    readonly bobP2WPKHAddr: Addr

    @prop()
    readonly timeout: bigint // Can be a timestamp or block height.

    @prop()
    readonly targetDifficulty: bigint

    @prop()
    readonly amountBTC: bigint

    @prop()
    readonly amountBSV: bigint

    constructor(
        aliceAddr: Addr,
        bobAddr: Addr,
        bobP2WPKHAddr: Addr,
        timeout: bigint,
        targetDifficulty: bigint,
        amountBTC: bigint,
        amountBSV: bigint
    ) {
        super(...arguments)
        this.aliceAddr = aliceAddr
        this.bobAddr = bobAddr
        this.bobP2WPKHAddr = bobP2WPKHAddr
        this.timeout = timeout
        this.targetDifficulty = targetDifficulty
        this.amountBTC = amountBTC
        this.amountBSV = amountBSV
    }

    @method()
    static parseVarInt(btcTx: ByteString, idx: bigint): VarIntRes {
        let res: VarIntRes = {
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

    @method()
    checkBtcTx(btcTx: ByteString): void {
        // Most things should be the same as in BSV except the witness data and flag.
        // - Check (first) output is P2WPKH to Bobs public key.
        // - Check (first) output amount is equal to this.amountBTC

        let idx = 4n

        // Make sure to serialize BTC tx without witness data.
        // See https://github.com/karask/python-bitcoin-utils/blob/a41c7a1e546985b759e6eb2ae4524f466be809ca/bitcoinutils/transactions.py#L913
        assert(
            slice(btcTx, idx, idx + 2n) != toByteString('0001'),
            'Witness data present. Please serialize without witness data.'
        )

        //// INPUTS:
        const inLen = BTCSwap.parseVarInt(btcTx, idx)
        assert(
            inLen.val <= BigInt(BTCSwap.BTC_MAX_INPUTS),
            'Number of inputs too large.'
        )
        idx = inLen.newIdx
        for (let i = 0n; i < BTCSwap.BTC_MAX_INPUTS; i++) {
            if (i < inLen.val) {
                //const prevTxID = slice(btcTx, idx, idx + 32n)
                idx += 32n
                //const outIdx = slice(btcTx, idx, idx + 4n)
                idx += 4n
                const scriptLen = BTCSwap.parseVarInt(btcTx, idx)
                idx = scriptLen.newIdx
                idx += scriptLen.val
                //const nSequence = slice(btcTx, idx, idx + 4n)
                idx += 4n
            }
        }

        //// FIRST OUTPUT:
        // Check if (first) output pays Bob the right amount and terminate and set res to true.
        const outLen = BTCSwap.parseVarInt(btcTx, idx)
        idx = outLen.newIdx
        const amount = Utils.fromLEUnsigned(slice(btcTx, idx, idx + 8n))
        assert(amount == this.amountBTC, 'Invalid BTC output amount.')
        idx += 8n
        const scriptLen = BTCSwap.parseVarInt(btcTx, idx)
        idx = scriptLen.newIdx
        const script = slice(btcTx, idx, idx + scriptLen.val)
        assert(len(script) == 22n, 'Invalid locking script length.')
        assert(
            script == toByteString('0014') + this.bobP2WPKHAddr,
            'Invalid locking script.'
        )

        // Data past this point is not relevant in our use-case.
    }

    @method()
    public swap(
        btcTx: ByteString,
        merkleProof: MerkleProof,
        headers: FixedArray<BlockHeader, typeof BTCSwap.MIN_CONF>,
        alicePubKey: PubKey,
        aliceSig: Sig
    ) {
        // Check btc tx.
        this.checkBtcTx(btcTx)

        // Calc merkle root.
        const txID = hash256(btcTx)
        const merkleRoot = MerklePath.calcMerkleRoot(txID, merkleProof)

        // Check if merkle root is included in the first BH.
        assert(
            merkleRoot == headers[0].merkleRoot,
            "Merkle root of proof doesn't match the one in the BH."
        )

        // Check target diff for headers.
        for (let i = 0; i < BTCSwap.MIN_CONF; i++) {
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
        for (let i = 0; i < BTCSwap.MIN_CONF; i++) {
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

        // Verify Alices signature.
        assert(
            pubKey2Addr(alicePubKey) == this.aliceAddr,
            'Alice wrong pub key.'
        )
        assert(this.checkSig(aliceSig, alicePubKey))
    }

    @method()
    public cancel(bobPubKey: PubKey, bobSig: Sig) {
        // Check timeout.
        assert(this.timeLock(this.timeout), 'time lock not yet expired')

        // Verify Bobs signature.
        assert(pubKey2Addr(bobPubKey) == this.bobAddr, 'Bob wrong pub key.')
        assert(this.checkSig(bobSig, bobPubKey))
    }
}
