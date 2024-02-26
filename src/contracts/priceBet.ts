import {
    SmartContract,
    prop,
    ByteString,
    method,
    assert,
    Utils,
    Sig,
    PubKey,
    slice,
} from 'scrypt-ts'
import { RabinSig, RabinPubKey, WitnessOnChainVerifier } from 'scrypt-ts-lib'

export type Message = {
    marker: bigint // 1 byte
    timestamp: bigint // 4 bytes LE
    price: bigint // 8 bytes LE
    decimal: bigint // 1 byte
    tradingPair: ByteString
}

/*
 * A betting contract that lets Alice and Bob bet on the price of the BSV-USDC pair
 * in the future. The price is obtained from a trusted oracle.
 * https://api.witnessonchain.com/#/v1/V1Controller_getPrice
 */
export class PriceBet extends SmartContract {
    // Price target that needs to be reached.
    @prop()
    targetPrice: bigint
    @prop()
    decimal: bigint

    // Trading pair, e.g. "BSV-USDC"
    @prop()
    tradingPair: ByteString

    // Timestamp window in which the price target needs to be reached.
    @prop()
    timestampFrom: bigint
    @prop()
    timestampTo: bigint

    // Oracles Rabin public key.
    @prop()
    oraclePubKey: RabinPubKey

    // Public keys of both players.
    @prop()
    alicePubKey: PubKey
    @prop()
    bobPubKey: PubKey

    constructor(
        targetPrice: bigint,
        decimal: bigint,
        tradingPair: ByteString,
        timestampFrom: bigint,
        timestampTo: bigint,
        oraclePubKey: RabinPubKey,
        alicePubKey: PubKey,
        bobPubKey: PubKey
    ) {
        super(...arguments)
        this.targetPrice = targetPrice
        this.decimal = decimal
        this.tradingPair = tradingPair
        this.timestampFrom = timestampFrom
        this.timestampTo = timestampTo
        this.oraclePubKey = oraclePubKey
        this.alicePubKey = alicePubKey
        this.bobPubKey = bobPubKey
    }

    // Parses signed message from the oracle.
    @method()
    static parseMessage(msg: ByteString): Message {
        return {
            marker: Utils.fromLEUnsigned(slice(msg, 0n, 1n)),
            timestamp: Utils.fromLEUnsigned(slice(msg, 1n, 5n)),
            price: Utils.fromLEUnsigned(slice(msg, 5n, 13n)),
            decimal: Utils.fromLEUnsigned(slice(msg, 13n, 14n)),
            tradingPair: slice(msg, 14n),
        }
    }

    @method()
    public unlock(msg: ByteString, sig: RabinSig, winnerSig: Sig) {
        // Verify oracle signature.
        assert(
            WitnessOnChainVerifier.verifySig(msg, sig, this.oraclePubKey),
            'Oracle sig verify failed.'
        )

        // Decode data.
        const message = PriceBet.parseMessage(msg)

        // Validate data.
        assert(message.marker == 2n, 'incorrect oracle message type.')
        assert(message.decimal == this.decimal, 'incorrect decimal.')
        assert(message.timestamp >= this.timestampFrom, 'Timestamp too early.')
        assert(message.timestamp <= this.timestampTo, 'Timestamp too late.')
        assert(
            message.tradingPair == this.tradingPair,
            'incorrect trading pair.'
        )

        // Decide winner and check their signature.
        const winner =
            message.price >= this.targetPrice
                ? this.alicePubKey
                : this.bobPubKey
        assert(this.checkSig(winnerSig, winner), 'Winner checkSig failed.')
    }
}
