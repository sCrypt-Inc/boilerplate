import {
    SmartContract,
    prop,
    ByteString,
    PubKeyHash,
    method,
    assert,
    Utils,
    hash256,
} from 'scrypt-ts'
import { RabinSig, RabinPubKey, RabinVerifierWOC } from 'scrypt-ts-lib'

export class PriceBet extends SmartContract {
    // Price target that needs to be reached.
    @prop()
    targetPrice: bigint

    // Symbol of the pair, e.g. "BSV_USDC"
    @prop()
    symbol: ByteString

    // Timestamp window in which the price target needs to be reached.
    @prop()
    timestampFrom: bigint
    @prop()
    timestampTo: bigint

    // Oracles Rabin public key.
    @prop()
    oraclePubKey: RabinPubKey

    // Addresses of both players.
    @prop()
    alicePkh: PubKeyHash
    @prop()
    bobPkh: PubKeyHash

    constructor(
        targetPrice: bigint,
        symbol: ByteString,
        timestampFrom: bigint,
        timestampTo: bigint,
        oraclePubKey: RabinPubKey,
        alicePkh: PubKeyHash,
        bobPkh: PubKeyHash
    ) {
        super(...arguments)
        this.targetPrice = targetPrice
        this.symbol = symbol
        this.timestampFrom = timestampFrom
        this.timestampTo = timestampTo
        this.oraclePubKey = oraclePubKey
        this.alicePkh = alicePkh
        this.bobPkh = bobPkh
    }

    @method()
    public unlock(msg: ByteString, sig: RabinSig) {
        // Verify oracle signature.
        assert(
            RabinVerifierWOC.verifySig(msg, sig, this.oraclePubKey),
            'Oracle sig verify failed.'
        )

        // Decode data.
        // 4 bytes timestamp (LE) + 8 bytes rate (LE) + 1 byte decimal + 16 bytes symbol
        const timestamp = Utils.fromLEUnsigned(msg.slice(0, 8))
        const price = Utils.fromLEUnsigned(msg.slice(8, 24))
        const symbol: ByteString = msg.slice(26, 58)

        // Validate data.
        assert(timestamp >= this.timestampFrom, 'Timestamp too early.')
        assert(timestamp <= this.timestampTo, 'Timestamp too late.')
        assert(symbol == this.symbol, 'Wrong symbol.')

        // Include output that pays the winner.
        const outAmount = this.ctx.utxo.value // Include all sats from contract instance.
        const winner = price >= this.targetPrice ? this.alicePkh : this.bobPkh
        const out = Utils.buildPublicKeyHashOutput(winner, outAmount)
        assert(this.ctx.hashOutputs == hash256(out), 'hashOutputs mismatch')
    }
}
